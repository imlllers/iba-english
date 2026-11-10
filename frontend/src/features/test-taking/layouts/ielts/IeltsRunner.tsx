import { Alert, Box, Button, Card, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnswerData, ContentItem } from "@/entities/question/types";
import type { ExamDisplayType } from "@/entities/test/types";
import { ERROR_EXPLANATIONS_ENABLED, normalizeQuestionNumberFormat } from "@/entities/test/settings";
import {
  formatQuestionRange,
  formatQuestionsHeading,
  isSlotAnswered,
  ownQuestionsHeading,
  questionSlotCount,
} from "@/features/question-types/numbering";
import { ContentFeedView, type ExamAudioBinding } from "@/features/question-types/content/ContentFeedView";
import { blockItems, contentItemFilled, scopeItems } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { passageFrameStyle, shouldFrameContentItems } from "@/features/question-types/content/passageFrame";
import { LimitedAudio, ListenFallbackButton } from "@/features/question-types/media/LimitedAudio";
import { useMedia } from "@/features/question-types/media/MediaContext";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { QuestionPlayer } from "@/features/question-types/QuestionPlayer";
import { useNow } from "@/shared/lib/useNow";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { Countdown } from "../../Countdown";
import { activeGateKey, pageGateAudios, questionAudioReady } from "../../pageAudioGate";
import { buildRunnerPages, type RunnerPage } from "../../runnerPages";
import { publicApi } from "../../publicApi";
import { TakeHeader } from "../../TakeHeader";
import { useFocusLossGuard } from "../../useFocusLossGuard";
import { usePersistentPageIndex } from "../../usePersistentPageIndex";
import { navUnits } from "../../navUnits";
import type { TestRunnerProps } from "../../runnerTypes";

function leftSeconds(end: string | null | undefined, now: number) {
  return end ? Math.ceil((new Date(end).getTime() - now) / 1000) : null;
}

function feedHasSideContent(items: ContentItem[]) {
  return items.some((item) => item.kind !== "audio" && contentItemFilled(item));
}

function feedAudioItems(items: ContentItem[]) {
  return items.filter((item) => item.kind === "audio" && item.mediaId);
}

function withoutAudio(items: ContentItem[]) {
  return items.filter((item) => item.kind !== "audio");
}

const panelStyle = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "auto",
  padding: "var(--mantine-spacing-lg)",
  background: "var(--mantine-color-body)",
  borderRadius: "var(--mantine-radius-md)",
  boxShadow: "var(--mantine-shadow-sm)",
} as const;

const PANEL_RAIL_PX = 10;

function ScrollPane({ className, children }: { className: string; children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, size: 1 });

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const size = Math.min(1, clientHeight / Math.max(scrollHeight, 1));
    const travel = Math.max(scrollHeight - clientHeight, 0);
    const top = travel === 0 ? 0 : (scrollTop / travel) * (1 - size);
    setThumb({ top, size: Math.max(size, 0.12) });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync, children]);

  return (
    <Box
      className={className}
      style={{
        ...panelStyle,
        overflow: "hidden",
        padding: 0,
        display: "flex",
        flexDirection: "row",
      }}
    >
      <Box
        ref={scrollerRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
          padding: "var(--mantine-spacing-lg)",
        }}
      >
        {children}
      </Box>
      <Box
        aria-hidden
        style={{
          flex: "none",
          width: PANEL_RAIL_PX,
          alignSelf: "stretch",
          position: "relative",
          background: "var(--mantine-color-body)",
          borderTopRightRadius: "var(--mantine-radius-md)",
          borderBottomRightRadius: "var(--mantine-radius-md)",
        }}
      >
        <Box
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: `${thumb.top * 100}%`,
            height: `${thumb.size * 100}%`,
            borderRadius: 4,
            background: "color-mix(in srgb, var(--color-dark) 28%, transparent)",
          }}
        />
      </Box>
    </Box>
  );
}

export function IeltsRunner(props: TestRunnerProps) {
  const {
    test, answers, onAnswer, saveError, expiresAt, blockEndsAt = null, sectionEnds,
    partEnds = {}, questionEnds = {},
    onEnterSection, onEnterPart, onEnterQuestions,
    onSubmit, onExpire, onFocusLossExhausted, focusLossStorageKey, pageStorageKey,
    submitting, submitError, attemptToken, demoMode = false,
  } = props;
  const media = useMedia();
  const oneQuestionPerPage = test.settings.oneQuestionPerPage !== false;
  const explanationMode = ERROR_EXPLANATIONS_ENABLED ? test.settings.errorExplanationMode ?? "off" : "off";
  const checkOnLeave = Boolean(attemptToken)
    && (explanationMode === "during" || explanationMode === "both");
  const numberScope = test.settings.questionNumberScope ?? "test";
  const examType = test.settings.examType ?? "CUSTOM";
  const pages = useMemo(
    () => buildRunnerPages(test.sections, { oneQuestionPerPage, numberScope, examType }),
    [test.sections, oneQuestionPerPage, numberScope, examType],
  );
  const totalSlotsCount = pages.reduce((sum, page) => sum + page.count, 0);
  const [index, setIndex] = usePersistentPageIndex(pages, pageStorageKey);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [audioDone, setAudioDone] = useState(() => new Set<string>());
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const headerAutoStarted = useRef(new Set<string>());
  const [listenNonce, setListenNonce] = useState(0);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [revealedPageKey, setRevealedPageKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const timed = Boolean(expiresAt)
    || Boolean(blockEndsAt)
    || Object.values(sectionEnds).some(Boolean)
    || Object.values(partEnds).some(Boolean)
    || Object.values(questionEnds).some(Boolean);
  const now = useNow(timed);
  const current = pages[Math.min(index, pages.length - 1)];
  const expired = useRef(false);
  const advanced = useRef(new Set<string>());
  const blockAdvanced = useRef(false);
  const questionAdvanced = useRef(new Set<string>());
  const focusLossMax = test.settings.focusLossMaxWarnings ?? 0;
  const audioAutoStart = Boolean(test.settings.audioAutoStart);
  const allowEarlySubmit = test.settings.allowEarlySubmit !== false;
  const autoAdvanceOnQuestionTimeout = Boolean(test.settings.autoAdvanceOnQuestionTimeout);
  const timedSectionTypes = test.settings.timeLimitSectionTypes ?? [];
  const numberFormat = normalizeQuestionNumberFormat(test.settings.questionNumberFormat);
  const focusGuard = useFocusLossGuard({
    enabled: focusLossMax > 0 && Boolean(onFocusLossExhausted),
    maxWarnings: focusLossMax > 0 ? focusLossMax : 1,
    storageKey: focusLossStorageKey ?? "iba-focus-loss",
    onExhausted: () => onFocusLossExhausted?.(),
  });

  const gateQueue = useMemo(() => (current ? pageGateAudios(current) : []), [current]);
  const gateActiveKey = activeGateKey(gateQueue, audioDone);
  const examAudioOn = gateQueue.length > 0;

  const markAudioEnded = useCallback((key: string) => {
    setAudioDone((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const onAutoPlayBlocked = useCallback(() => setAutoPlayBlocked(true), []);

  const blockExamAudio = useMemo<ExamAudioBinding | undefined>(() => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: audioAutoStart && !autoPlayBlocked,
      completed: audioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `block:${item.id}` : null),
      onEnded: markAudioEnded,
      onAutoPlayBlocked,
    };
  }, [examAudioOn, audioAutoStart, autoPlayBlocked, audioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked]);

  const questionExamAudio = useCallback((questionId: string): ExamAudioBinding | undefined => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: audioAutoStart && !autoPlayBlocked,
      completed: audioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `question:${questionId}:${item.id}` : null),
      onEnded: markAudioEnded,
      onAutoPlayBlocked,
    };
  }, [examAudioOn, audioAutoStart, autoPlayBlocked, audioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked]);

  const sectionLeft = (id: string) => leftSeconds(sectionEnds[id], now);
  const partLeft = (id: string) => leftSeconds(partEnds[id], now);
  const questionLeft = (id: string) => leftSeconds(questionEnds[id], now);
  const sectionLocked = (id: string) => {
    const left = sectionLeft(id);
    return left !== null && left <= 0;
  };
  const partLocked = (id: string | null | undefined) => {
    if (!id) {
      return false;
    }
    const left = partLeft(id);
    return left !== null && left <= 0;
  };
  const inTimedBlock = timedSectionTypes.length === 0
    || (current != null && timedSectionTypes.includes(current.section.sectionType));
  const wholeTestLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - now) / 1000) : null;
  const blockLeft = blockEndsAt && inTimedBlock
    ? Math.ceil((new Date(blockEndsAt).getTime() - now) / 1000)
    : null;
  const testLeft = timedSectionTypes.length > 0 ? blockLeft : wholeTestLeft;

  useEffect(() => {
    setAutoPlayBlocked(false);
  }, [current?.key]);

  useEffect(() => {
    if (!current) {
      setFocusSlot(null);
      return;
    }
    setFocusSlot((prev) => (
      prev != null && prev >= current.start && prev <= current.end ? prev : current.start
    ));
  }, [current?.key, current?.start, current?.end]);

  useEffect(() => {
    if (!current) {
      return;
    }
    onEnterSection(current.section.id);
    if (current.part?.id) {
      onEnterPart?.(current.part.id);
    }
    const readyIds = current.questions
      .filter((question) => questionAudioReady(gateQueue, audioDone, question))
      .map((question) => question.id);
    if (readyIds.length) {
      onEnterQuestions?.(readyIds);
    }
  }, [current?.key, gateQueue, audioDone, onEnterSection, onEnterPart, onEnterQuestions]);

  useEffect(() => {
    if (wholeTestLeft !== null && wholeTestLeft <= 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [wholeTestLeft, onExpire]);

  useEffect(() => {
    if (demoMode || blockLeft === null || blockLeft > 0 || blockAdvanced.current) {
      return;
    }
    blockAdvanced.current = true;
    const next = pages.findIndex((page) => !timedSectionTypes.includes(page.section.sectionType));
    if (next >= 0) {
      setIndex(next);
      return;
    }
    if (!expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [blockLeft, demoMode, pages, timedSectionTypes, onExpire]);

  useEffect(() => {
    if (demoMode || !current || !sectionLocked(current.section.id) || advanced.current.has(current.section.id)) {
      return;
    }
    advanced.current.add(current.section.id);
    const next = pages.findIndex((page) => page.sectionIndex > current.sectionIndex && !sectionLocked(page.section.id));
    if (next >= 0) {
      setIndex(next);
    }
  }, [now, current?.section.id, demoMode]);

  useEffect(() => {
    if (demoMode || !autoAdvanceOnQuestionTimeout || !current) {
      return;
    }
    const expiredIds = current.questions
      .filter((question) => {
        const left = questionLeft(question.id);
        return left !== null && left <= 0 && !questionAdvanced.current.has(question.id);
      })
      .map((question) => question.id);
    if (!expiredIds.length) {
      return;
    }
    expiredIds.forEach((id) => questionAdvanced.current.add(id));
    const allTimedDone = current.questions.every((question) => {
      if (!question.settings.timeLimitSeconds) {
        return true;
      }
      const left = questionLeft(question.id);
      return left !== null && left <= 0;
    });
    if (allTimedDone && index < pages.length - 1) {
      setIndex(index + 1);
    }
  }, [now, current?.key, autoAdvanceOnQuestionTimeout, demoMode, index, pages.length]);

  const canGoTo = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pages.length) {
      return false;
    }
    if (demoMode || targetIndex >= index) {
      return true;
    }
    const target = pages[targetIndex];
    const from = pages[index];
    if (!target || !from) {
      return false;
    }
    const fromSection = from.section;
    const allowBackToSection = test.settings.allowBackToSection !== false;
    const allowBackToPart = (fromSection.allowBackToPart ?? test.settings.allowBackToPart) !== false;
    const allowBackToQuestions = (fromSection.allowBackToQuestions ?? test.settings.allowBackToQuestions) !== false;
    if (target.section.id !== from.section.id) {
      return allowBackToSection;
    }
    const targetPart = target.part?.id ?? null;
    const fromPart = from.part?.id ?? null;
    if (targetPart !== fromPart) {
      return allowBackToPart;
    }
    return allowBackToQuestions;
  };

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    if (!canGoTo(clamped)) {
      return;
    }
    setIndex(clamped);
    top.current?.scrollTo({ top: 0 });
  };

  const handleAnswer = useCallback((questionId: string, answer: AnswerData) => {
    setExplanations((prev) => {
      if (!(questionId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    if (current?.key === revealedPageKey) {
      setRevealedPageKey(null);
    }
    onAnswer(questionId, answer);
  }, [onAnswer, current?.key, revealedPageKey]);

  const checkCurrentPage = useCallback(async (): Promise<boolean> => {
    if (!checkOnLeave || !attemptToken || !current) {
      return false;
    }
    if (revealedPageKey === current.key) {
      return false;
    }
    setChecking(true);
    try {
      const nextMap: Record<string, string> = { ...explanations };
      let showed = false;
      await Promise.all(current.questions.map(async (question) => {
        const result = await publicApi.checkAnswer(
          attemptToken,
          question.id,
          answers[question.id] ?? {},
        );
        if (result.explanation) {
          nextMap[question.id] = result.explanation;
          showed = true;
        } else {
          delete nextMap[question.id];
        }
      }));
      setExplanations(nextMap);
      setRevealedPageKey(current.key);
      return showed;
    } catch {
      setRevealedPageKey(current.key);
      return false;
    } finally {
      setChecking(false);
    }
  }, [checkOnLeave, attemptToken, current, revealedPageKey, explanations, answers]);

  const goChecked = useCallback((next: number) => {
    if (checking) {
      return;
    }
    if (next <= index || !checkOnLeave) {
      go(next);
      return;
    }
    void (async () => {
      const stayed = await checkCurrentPage();
      if (!stayed) {
        go(next);
      }
    })();
  }, [checking, index, checkOnLeave, checkCurrentPage]);

  const unansweredSlots = pages.reduce((sum, page) => {
    let missing = 0;
    for (const question of page.questions) {
      const slots = questionSlotCount(question, examType);
      for (let indexSlot = 0; indexSlot < slots; indexSlot += 1) {
        if (!isSlotAnswered(question, answers[question.id], indexSlot)) {
          missing += 1;
        }
      }
    }
    return sum + missing;
  }, 0);
  const currentSectionLeft = current ? sectionLeft(current.section.id) : null;
  const currentPartLeft = current?.part?.id ? partLeft(current.part.id) : null;
  const pageReadOnly = current && !demoMode
    ? sectionLocked(current.section.id) || partLocked(current.part?.id)
    : false;
  const sectionFeed = current ? scopeItems(current.section) : [];
  const partFeed = current?.part ? scopeItems(current.part) : [];
  const headerAudio = [...feedAudioItems(sectionFeed), ...feedAudioItems(partFeed)];
  const sideSectionFeed = withoutAudio(sectionFeed);
  const sidePartFeed = withoutAudio(partFeed);
  const splitWorkspace = feedHasSideContent(sideSectionFeed) || feedHasSideContent(sidePartFeed);
  const headerAudioNode = headerAudio.length > 0 ? (
    <Stack gap={4}>
      {headerAudio.map((item) => (
        <HeaderAudio
          key={item.id}
          id={item.id}
          src={media.asset(item.mediaId!)}
          autoStart={audioAutoStart}
          autoStarted={headerAutoStarted.current}
        />
      ))}
    </Stack>
  ) : null;

  const sectionInstructions = current ? toInstructionDoc(current.section.instructions) : null;
  const partInstructions = current?.part ? toInstructionDoc(current.part.instructions) : null;
  const hasSectionInstr = sectionInstructions ? instructionHasContent(sectionInstructions) : false;
  const hasPartInstr = partInstructions ? instructionHasContent(partInstructions) : false;

  const scopeHeading = (key: string) => (current ? (
    <Stack key={key} gap={6}>
      <Stack gap={2} mb={12}>
        <Text
          fw={700}
          lh={1.2}
          style={{ fontSize: "var(--type-h5-size)" }}
        >
          {current.section.title}
        </Text>
        {current.part?.title ? (
          <Text
            fw={600}
            c="dimmed"
            lh={1.2}
            style={{ fontSize: "var(--type-h6-size)" }}
          >
            {current.part.title}
          </Text>
        ) : null}
      </Stack>
      {hasSectionInstr && sectionInstructions ? (
        <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
          <PromptView doc={sectionInstructions} />
        </Box>
      ) : null}
      {hasPartInstr && partInstructions ? (
        <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
          <PromptView doc={partInstructions} />
        </Box>
      ) : null}
    </Stack>
  ) : null);

  const onChromeNext = async () => {
    if (checking) {
      return;
    }
    const stayed = await checkCurrentPage();
    if (stayed) {
      return;
    }
    if (index < pages.length - 1) {
      go(index + 1);
    } else {
      setConfirming(true);
    }
  };

  const navGroups = useMemo(() => buildNavGroups(pages), [pages]);

  const goToSlot = (slot: number, within: RunnerPage[] = pages) => {
    const page = within.find((item) => slot >= item.start && slot <= item.end);
    if (!page) {
      return;
    }
    const pageIndex = pages.indexOf(page);
    if (pageIndex < 0 || !canGoTo(pageIndex)) {
      return;
    }
    setFocusSlot(slot);
    goChecked(pageIndex);
    requestAnimationFrame(() => {
      document.getElementById(`runner-slot-${page.key}-${slot}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const numberStrip = (
    <Box
      component="nav"
      aria-label="Questions"
      style={{
        flex: "none",
        zIndex: 5,
        height: 64,
        display: "flex",
        alignItems: "center",
        overflow: "auto hidden",
        background: "var(--mantine-color-body)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <Group
        gap={0}
        wrap="nowrap"
        align="center"
        style={{
          flex: "none",
          minHeight: "100%",
          paddingInline: "var(--space-16)",
        }}
      >
          {navGroups.map((group, groupIndex) => {
            const active = Boolean(current && group.pages.some((page) => page.key === current.key));
            const expanded = active;
            const progress = groupSlotProgress(group, answers, examType);
            const locked = !demoMode && (sectionLocked(group.sectionId) || partLocked(group.partId));
            const openGroup = () => {
              const first = group.pages[0];
              if (!first) return;
              goToSlot(first.start, group.pages);
            };
            return (
              <Group key={group.key} gap={0} wrap="nowrap" align="center" style={{ flex: "none" }}>
                {groupIndex > 0 ? (
                  <Box
                    aria-hidden
                    style={{
                      width: 1,
                      alignSelf: "stretch",
                      minHeight: 28,
                      marginInline: "var(--mantine-spacing-md)",
                      background: "var(--color-border)",
                      flex: "none",
                    }}
                  />
                ) : null}
                <Group gap="sm" wrap="nowrap" align="center" style={{ flex: "none" }}>
                  <Text
                    component="button"
                    type="button"
                    fw={700}
                    size="sm"
                    c={locked ? "dimmed" : undefined}
                    disabled={locked && !active}
                    onClick={openGroup}
                    style={{
                      whiteSpace: "nowrap",
                      background: "none",
                      border: 0,
                      padding: 0,
                      cursor: locked && !active ? "not-allowed" : "pointer",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    {group.label}
                    {locked ? " · time is up" : ""}
                  </Text>
                  {expanded ? (
                    <Group gap={4} component="ol" wrap="nowrap" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {group.pages.flatMap((page) => {
                        const pageIndex = pages.indexOf(page);
                        const allowed = canGoTo(pageIndex);
                        return navUnits(page, answers, examType).map((unit) => {
                          const answered = unit.answered === unit.total;
                          const focused = focusSlot !== null && focusSlot >= unit.start && focusSlot <= unit.end;
                          const label = formatQuestionRange(unit.start, unit.total, numberFormat);
                          return (
                            <Box component="li" key={unit.key}>
                              <UnstyledButton
                                aria-current={focused ? "step" : undefined}
                                aria-disabled={!allowed}
                                disabled={!allowed}
                                aria-label={`${label}${answered ? ", answered" : unit.answered > 0 ? `, ${unit.answered} of ${unit.total} answered` : ", not answered"}${allowed ? "" : ", unavailable"}`}
                                onClick={() => goToSlot(unit.start, group.pages)}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 3,
                                  minWidth: 22,
                                  height: 36,
                                  paddingInline: 3,
                                  background: "transparent",
                                  opacity: allowed ? 1 : 0.4,
                                  cursor: allowed ? "pointer" : "not-allowed",
                                }}
                              >
                                <Box
                                  aria-hidden
                                  style={{
                                    width: unit.total > 1 ? "100%" : 12,
                                    height: 2,
                                    borderRadius: 1,
                                    background: answered || focused
                                      ? "var(--color-primary)"
                                      : "color-mix(in srgb, var(--color-dark) 22%, transparent)",
                                  }}
                                />
                                <Text
                                  span
                                  size="sm"
                                  fw={focused || answered ? 700 : 500}
                                  c={focused ? "iba" : answered ? "dark" : "dimmed"}
                                  style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}
                                >
                                  {label}
                                </Text>
                              </UnstyledButton>
                            </Box>
                          );
                        });
                      })}
                    </Group>
                  ) : (
                    <Text
                      component="button"
                      type="button"
                      size="sm"
                      c="dimmed"
                      disabled={locked}
                      onClick={openGroup}
                      style={{
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        background: "none",
                        border: 0,
                        padding: 0,
                        cursor: locked ? "not-allowed" : "pointer",
                        font: "inherit",
                      }}
                    >
                      {progress.answered} / {progress.total}
                    </Text>
                  )}
                </Group>
              </Group>
            );
          })}
        </Group>
    </Box>
  );

  const renderBlockPanel = (block: NonNullable<typeof current>["block"]) => {
    if (!block) {
      return null;
    }
    const items = blockItems(block);
    const filled = items.some(contentItemFilled);
    const blockInstructions = toInstructionDoc(block.instructions);
    const hasInstructions = instructionHasContent(blockInstructions);
    if (!hasInstructions && !filled) {
      return null;
    }
    return (
      <Stack key={`block-panel-${block.id}`} gap="sm">
        {hasInstructions ? (
          <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
            <PromptView doc={blockInstructions} />
          </Box>
        ) : null}
        {filled ? (
          <Box
            className="iba-test-copy"
            style={shouldFrameContentItems(items) ? passageFrameStyle : undefined}
          >
            <ContentFeedView
              items={items}
              examAudio={blockExamAudio}
              playbackKey={media.playbackScope ? `iba-plays:${media.playbackScope}:block:${block.id}` : undefined}
            />
          </Box>
        ) : null}
      </Stack>
    );
  };

  const questionStack = current ? (
    <Stack gap="md">
      {(() => {
        let start = current.start;
        let lastBlockId: string | null = current.block?.id ?? null;
        const nodes: ReactNode[] = [];
        const blockHeadingFor = (blockId: string) => {
          let cursor = current.start;
          let from = Number.POSITIVE_INFINITY;
          let to = Number.NEGATIVE_INFINITY;
          for (const item of current.questions) {
            const slots = questionSlotCount(item, examType);
            if ((item.materialBlockId ?? null) === blockId) {
              from = Math.min(from, cursor);
              to = Math.max(to, cursor + slots - 1);
            }
            cursor += slots;
          }
          return Number.isFinite(from) ? formatQuestionsHeading(from, to) : null;
        };
        const pushBlockHeading = (blockId: string, key: string) => {
          const heading = blockHeadingFor(blockId);
          if (!heading) {
            return;
          }
          nodes.push(
            <Text
              key={key}
              fw={700}
              className="iba-test-copy"
              style={{ fontSize: "var(--type-body, 1rem)", lineHeight: "inherit" }}
            >
              {heading}
            </Text>,
          );
        };
        if (current.block) {
          pushBlockHeading(current.block.id, `block-heading-${current.block.id}`);
          nodes.push(renderBlockPanel(current.block));
        }
        for (const question of current.questions) {
          const count = questionSlotCount(question, examType);
          const questionStart = start;
          start += count;
          const qLeft = questionLeft(question.id);
          const qLocked = qLeft !== null && qLeft <= 0;
          const timedQuestion = Boolean(question.settings.timeLimitSeconds);
          const audioPending = timedQuestion && examAudioOn && !questionAudioReady(gateQueue, audioDone, question)
            && questionEnds[question.id] == null;
          const blockId = question.materialBlockId ?? null;
          if (!current.block && blockId && blockId !== lastBlockId) {
            lastBlockId = blockId;
            const block = current.section.materialBlocks?.find((item) => item.id === blockId) ?? null;
            pushBlockHeading(blockId, `block-heading-${blockId}`);
            nodes.push(renderBlockPanel(block));
          }
          const groupHeading = blockId ? blockHeadingFor(blockId) : null;
          const ownHeading = ownQuestionsHeading(question, questionStart, examType);
          nodes.push(
            <Stack key={question.id} gap="xs" style={{ position: "relative", scrollMarginTop: 16 }}>
              <Box
                aria-hidden
                style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
              >
                {Array.from({ length: count }, (_, offset) => (
                  <Box
                    key={`anchor-${questionStart + offset}`}
                    id={`runner-slot-${current.key}-${questionStart + offset}`}
                    component="span"
                  />
                ))}
              </Box>
              {audioPending ? (
                <SettingsHint>The timer starts after the audio</SettingsHint>
              ) : null}
              {qLeft !== null && qLeft > 0 ? (
                <Countdown label="Question" seconds={qLeft} />
              ) : null}
              {qLocked ? (
                <Alert color="yellow" variant="light" p="xs">Time for this question is up</Alert>
              ) : null}
              <QuestionPlayer
                question={question}
                kicker={formatQuestionRange(questionStart, count, numberFormat)}
                answer={answers[question.id] ?? {}}
                onAnswer={(answer) => handleAnswer(question.id, answer)}
                readOnly={!demoMode && (pageReadOnly || qLocked)}
                startNumber={questionStart}
                numberFormat={numberFormat}
                examType={examType}
                examAudio={questionExamAudio(question.id)}
                hideQuestionsHeading={Boolean(groupHeading && ownHeading === groupHeading)}
              />
              {explanations[question.id] ? (
                <Alert color="orange" variant="light" p="sm">
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{explanations[question.id]}</Text>
                </Alert>
              ) : null}
            </Stack>,
          );
        }
        return nodes;
      })()}
    </Stack>
  ) : null;

  const audioListenBanner = examAudioOn && audioAutoStart && autoPlayBlocked && gateActiveKey ? (
    <Alert color="iba" variant="light" mb="md">
      <Group justify="space-between" gap="md" wrap="wrap">
        <Text size="sm">Press “Play” to start the audio. It cannot be paused</Text>
        <ListenFallbackButton
          onClick={() => {
            setAutoPlayBlocked(false);
            setListenNonce((value) => value + 1);
          }}
        />
      </Group>
    </Alert>
  ) : null;

  const sectionHeaderSeconds = currentSectionLeft !== null
    ? currentSectionLeft
    : (current?.section.timeLimitMinutes && sectionEnds[current.section.id] == null
      ? current.section.timeLimitMinutes * 60
      : null);
  const partHeaderSeconds = currentPartLeft !== null
    ? currentPartLeft
    : (current?.part?.timeLimitMinutes && current.part.id && partEnds[current.part.id] == null
      ? current.part.timeLimitMinutes * 60
      : null);

  const alerts = (
    <>
      {saveError && (
        <Alert color="red" variant="light" role="alert" mb="md">
          {saveError}. Your answers will be saved automatically when the connection is restored
        </Alert>
      )}
      {!current && <Text c="dimmed">This test has no questions</Text>}
      {current && pageReadOnly && (
        <Alert color="yellow" variant="light" role="status" mb="md">
          {sectionLocked(current.section.id)
            ? "Time for this section is up. You can no longer change your answers in it"
            : "Time for this part is up. You can no longer change your answers in it"}
        </Alert>
      )}
    </>
  );

  const earlyFinish = current && index < pages.length - 1 && allowEarlySubmit ? (
      <Group justify="flex-end">
        <Button
          variant="subtle"
          size="compact-sm"
          loading={checking}
          onClick={() => {
            void (async () => {
              const stayed = await checkCurrentPage();
              if (!stayed) {
                setConfirming(true);
              }
            })();
          }}
        >
          Finish test early
        </Button>
      </Group>
  ) : null;
  const pageNav = current ? (
    <Stack gap="sm">
      <Group justify="flex-end" gap="md" wrap="nowrap">
        <Button
          size="md"
          variant="default"
          disabled={index === 0 || !canGoTo(index - 1)}
          onClick={() => go(index - 1)}
        >
          Back
        </Button>
        <Button size="md" color="iba" onClick={onChromeNext}>
          {index < pages.length - 1 ? "Next" : "Finish"}
        </Button>
      </Group>
      {earlyFinish}
    </Stack>
  ) : null;

  return (
    <Box
      data-runner-layout="ielts"
      style={{
        minHeight: "100vh",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-page)",
        overflow: "hidden",
      }}
    >
      <TakeHeader center={headerAudioNode}>
        {focusLossMax > 0 && onFocusLossExhausted ? (
          <Text size="sm" c={focusGuard.count > 0 ? "orange" : "dimmed"} style={{ whiteSpace: "nowrap" }}>
            Tab switches: {focusGuard.count} of {focusLossMax}
          </Text>
        ) : null}
        {sectionHeaderSeconds !== null && sectionHeaderSeconds > 0 ? (
          <Countdown label="Section" seconds={sectionHeaderSeconds} digitsOnly />
        ) : null}
        {partHeaderSeconds !== null && partHeaderSeconds > 0 ? (
          <Countdown label="Part" seconds={partHeaderSeconds} digitsOnly />
        ) : null}
        {testLeft !== null ? <Countdown label="Test" seconds={testLeft} digitsOnly /> : null}
      </TakeHeader>
      <Box
        ref={top}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: splitWorkspace ? "hidden" : "auto",
          paddingBlock: "var(--space-24)",
          paddingInline: "var(--space-16)",
        }}
      >
        {alerts}
        {audioListenBanner}
        {current && splitWorkspace ? (
          <Box
            className="runner-workspace-split"
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: "var(--grid-gutter)",
              alignItems: "stretch",
            }}
          >
            <ScrollPane className="runner-reading">
              <Stack gap="md">
                {feedHasSideContent(sideSectionFeed) ? <ContentFeedView items={sideSectionFeed} /> : null}
                {feedHasSideContent(sidePartFeed) ? <ContentFeedView items={sidePartFeed} /> : null}
              </Stack>
            </ScrollPane>
            <ScrollPane className="runner-questions">
              <Stack gap={8}>
                {scopeHeading("questions")}
                {questionStack}
                {pageNav}
              </Stack>
            </ScrollPane>
          </Box>
        ) : null}
        {current && !splitWorkspace ? (
          <Card maw={920} w="100%" mx="auto" shadow="sm" bg="white" style={{ flex: "none" }}>
            <Stack gap={8}>
              {scopeHeading("main")}
              {questionStack}
              {pageNav}
            </Stack>
          </Card>
        ) : null}
      </Box>
      {numberStrip}
      <Modal
        opened={focusGuard.warningOpen}
        onClose={focusGuard.dismissWarning}
        title="Do not leave the test page"
        centered
      >
        <Stack gap="md">
          <Text c="dimmed">
            You switched to another tab or window. Warning {focusGuard.count} of {focusLossMax}.
            {focusGuard.count >= focusLossMax - 1
              ? " If you leave again, your answers will be submitted automatically"
              : " Stay on the test page until you finish"}
          </Text>
          <Group justify="flex-end">
            <Button color="iba" onClick={focusGuard.dismissWarning}>OK</Button>
          </Group>
        </Stack>
      </Modal>
      {confirming && (
        <ConfirmDialog
          open
          title="Submit your answers?"
          confirmLabel="Submit"
          cancelLabel="Cancel"
          busyLabel="Submitting…"
          busy={submitting}
          error={submitError}
          onConfirm={onSubmit}
          onClose={() => setConfirming(false)}
        >
          {unansweredSlots === 0
            ? "You have answered all the questions. You will not be able to change your answers after submitting."
            : `Unanswered: ${unansweredSlots}/${totalSlotsCount}. You will not be able to change your answers after submitting.`}
        </ConfirmDialog>
      )}
      <style>{`
        @media (max-width: 767px) {
          .runner-workspace-split {
            grid-template-columns: 1fr !important;
            overflow: auto !important;
          }
          .runner-reading,
          .runner-questions {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>
    </Box>
  );
}

type NavGroup = {
  key: string;
  label: string;
  sectionId: string;
  partId: string | null;
  pages: RunnerPage[];
};

function buildNavGroups(pages: RunnerPage[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const page of pages) {
    const key = page.part?.id ? `part:${page.part.id}` : `section:${page.section.id}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.pages.push(page);
      continue;
    }
    groups.push({
      key,
      label: page.part?.title || page.section.title,
      sectionId: page.section.id,
      partId: page.part?.id ?? null,
      pages: [page],
    });
  }
  return groups;
}

function groupSlotProgress(
  group: NavGroup,
  answers: Record<string, AnswerData>,
  examType: ExamDisplayType,
) {
  let answered = 0;
  let total = 0;
  for (const page of group.pages) {
    for (const question of page.questions) {
      const slots = questionSlotCount(question, examType);
      total += slots;
      const answer = answers[question.id];
      for (let offset = 0; offset < slots; offset += 1) {
        if (isSlotAnswered(question, answer, offset)) {
          answered += 1;
        }
      }
    }
  }
  return { answered, total };
}

function HeaderAudio({ id, src, autoStart, autoStarted }: {
  id: string;
  src: string;
  autoStart: boolean;
  autoStarted: Set<string>;
}) {
  const [autoPlay] = useState(() => autoStart && !autoStarted.has(id));
  useEffect(() => {
    autoStarted.add(id);
  }, [autoStarted, id]);
  return <LimitedAudio src={src} limit={0} compact label="Audio" autoPlay={autoPlay} />;
}
