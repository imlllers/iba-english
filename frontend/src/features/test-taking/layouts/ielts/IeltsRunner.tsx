import { Alert, Box, Button, Card, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AnswerData, ContentItem } from "@/entities/question/types";
import type { ExamDisplayType } from "@/entities/test/types";
import { errorExplanationsEnabled, normalizeQuestionNumberFormat } from "@/entities/test/settings";
import {
  formatQuestionRange,
  formatQuestionsHeading,
  isSlotAnswered,
  ownQuestionsHeading,
  questionSlotCount,
  toeflQuestionBlockHeading,
} from "@/features/question-types/numbering";
import { ContentFeedView, type ExamAudioBinding } from "@/features/question-types/content/ContentFeedView";
import { blockItems, contentItemFilled, scopeItems } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { passageFrameStyle, shouldFrameContentItems } from "@/features/question-types/content/passageFrame";
import { LimitedAudio, ListenFallbackButton } from "@/features/question-types/media/LimitedAudio";
import { useMedia } from "@/features/question-types/media/MediaContext";
import { ScopeInstructionView } from "@/features/question-types/content/ScopeInstructionView";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { QuestionPlayer } from "@/features/question-types/QuestionPlayer";
import { useNow } from "@/shared/lib/useNow";
import { limitSecondsFromSection } from "@/shared/lib/durationMmSs";
import { partLimitSeconds } from "../../partTiming";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { Countdown } from "../../Countdown";
import { activeGateKey, pageGateAudios, questionAudioReady, speakingPromptCanStart } from "../../pageAudioGate";
import { pageInteractionReady } from "../../partTimerGate";
import { isSpeakingAutoFlow } from "../../speakingAutoFlow";
import { questionReadingSeconds } from "../../readingPhase";
import { buildRunnerPages, type RunnerPage } from "../../runnerPages";
import { publicApi } from "../../publicApi";
import { shouldAutoPlayQuestionTaskVideo } from "../toefl/questionTaskVideo";
import { toeflAllowChromeNext } from "../toefl/toeflNavigation";
import { engineOf } from "@/features/question-types/registry";
import { TakeHeader } from "../../TakeHeader";
import { useFocusLossGuard } from "../../useFocusLossGuard";
import { usePersistentPageIndex } from "../../usePersistentPageIndex";
import { navUnits } from "../../navUnits";
import { withDemoPageNav } from "../../RunnerDemoChromeLayout";
import { showRunnerBack, showRunnerForward } from "../../runnerChromeNav";
import type { TestRunnerProps } from "../../runnerTypes";
import { RunnerScrollPane } from "../../RunnerScrollPane";
import { RunnerDemoQuestionNav } from "../../RunnerDemoQuestionNav";
import { buildNavGroups } from "../../runnerNavGroups";
import { PartExampleView } from "@/features/question-types/content/PartExampleView";
import { partExampleFilled } from "@/features/question-types/content/partExample";
import { isToeicListening, scopeIntroAudios, screenHasTimedQuestions } from "../../toeicListening";
import { toeicMaterialGroupLayout } from "../../toeicGroupLayout";
import { resolveChromeProgressPage, scopeSlotTotal, toeflChromeProgress } from "../toefl/toeflChromeProgress";
import { type ToeflPage, withPartExampleIntros, withScopeIntroPages } from "../toefl/toeflPages";
import { ToeflTakeShell } from "../toefl/ToeflTakeShell";
import { PasswordVisibilityIcon } from "@/shared/ui/PasswordVisibilityIcon";

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

function ToeicRightColumnWithNav({
  nav,
  showNav,
  navClassName,
  children,
}: {
  nav: React.ReactNode;
  showNav: boolean;
  navClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      className="runner-toeic-right-column"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        width: "100%",
      }}
    >
      <Box style={{ minWidth: 0, width: "100%" }}>
        {children}
      </Box>
      {showNav && nav ? (
        <Box className={navClassName ?? "runner-toeic-page-nav-slot"} style={{ flex: "none" }}>
          {nav}
        </Box>
      ) : null}
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
    initialAudioDone = [], onPersistAudioDone, flushAnswers,
    initialReadingStarted = {}, initialReadingDone = [],
    onPersistReadingStart, onPersistReadingDone,
  } = props;
  const media = useMedia();
  const oneQuestionPerPage = test.settings.oneQuestionPerPage !== false;
  const explanationMode = errorExplanationsEnabled(test.settings.examType)
    ? test.settings.errorExplanationMode ?? "off"
    : "off";
  const checkOnLeave = Boolean(attemptToken)
    && (explanationMode === "during" || explanationMode === "both");
  const numberScope = test.settings.questionNumberScope ?? "test";
  const examType = test.settings.examType ?? "CUSTOM";
  const toeicStackedChrome = examType === "TOEIC";
  const pages = useMemo(() => {
    const base = buildRunnerPages(test.sections, { oneQuestionPerPage, numberScope, examType });
    if (examType === "TOEIC") {
      return withScopeIntroPages(base);
    }
    if (examType === "CUSTOM") {
      return withPartExampleIntros(base);
    }
    return base;
  }, [test.sections, oneQuestionPerPage, numberScope, examType]);
  const totalSlotsCount = pages.reduce((sum, page) => sum + page.count, 0);
  const [index, setIndex] = usePersistentPageIndex(pages, pageStorageKey);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [audioDone, setAudioDone] = useState(() => new Set(initialAudioDone));
  const readingStartedAnnounced = useRef(new Set(Object.keys(initialReadingStarted)));
  const [readingDone, setReadingDone] = useState(() => new Set(initialReadingDone));
  const [readingLeft, setReadingLeft] = useState<Record<string, number>>({});
  const persistReadingStartRef = useRef(onPersistReadingStart);
  persistReadingStartRef.current = onPersistReadingStart;
  const persistReadingDoneRef = useRef(onPersistReadingDone);
  persistReadingDoneRef.current = onPersistReadingDone;
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const headerAutoStarted = useRef(new Set<string>());
  const [listenNonce, setListenNonce] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const demoVisitedPages = useRef(new Set<string>());
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [revealedPageKey, setRevealedPageKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [timersVisible, setTimersVisible] = useState(true);
  const top = useRef<HTMLDivElement>(null);
  const scrollRunnerToTop = useCallback(() => {
    const root = top.current;
    if (!root) {
      return;
    }
    const panes = root.querySelectorAll<HTMLElement>(".runner-scroll-body");
    if (panes.length > 0) {
      panes.forEach((el) => {
        el.scrollTop = 0;
      });
      return;
    }
    root.scrollTo({ top: 0 });
  }, []);
  const timed = Boolean(expiresAt)
    || Boolean(blockEndsAt)
    || Object.values(sectionEnds).some(Boolean)
    || Object.values(partEnds).some(Boolean)
    || Object.values(questionEnds).some(Boolean);
  const now = useNow(timed);
  const current = pages[Math.min(index, pages.length - 1)];
  const currentPageKey = current?.key;
  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollRunnerToTop());
    return () => cancelAnimationFrame(frame);
  }, [index, currentPageKey, scrollRunnerToTop]);

  useEffect(() => {
    if (!initialReadingDone.length) {
      return;
    }
    setReadingDone((prev) => {
      const next = new Set(prev);
      for (const id of initialReadingDone) {
        next.add(id);
      }
      return next;
    });
  }, [initialReadingDone]);

  useEffect(() => {
    if (!current) {
      return;
    }
    const timers: Array<ReturnType<typeof setInterval>> = [];
    const pending = current.questions.filter(
      (question) => questionReadingSeconds(question) > 0 && !readingDone.has(question.id),
    );
    for (const question of pending) {
      const total = questionReadingSeconds(question);
      if (!readingStartedAnnounced.current.has(question.id)) {
        readingStartedAnnounced.current.add(question.id);
        if (!demoMode) {
          persistReadingStartRef.current?.(question.id);
        }
      }
      const startedFromServer = initialReadingStarted[question.id]
        ? new Date(initialReadingStarted[question.id]).getTime()
        : NaN;
      const readingKey = pageStorageKey ? `${pageStorageKey}:read:${question.id}` : "";
      let started = Number.isFinite(startedFromServer) ? startedFromServer : NaN;
      if (!Number.isFinite(started) && readingKey) {
        const raw = sessionStorage.getItem(readingKey);
        const parsed = raw ? Number(raw) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          started = parsed;
        }
      }
      if (!Number.isFinite(started)) {
        started = Date.now();
      }
      if (readingKey) {
        try {
          sessionStorage.setItem(readingKey, String(started));
        } catch {
        }
      }
      const timer = setInterval(() => {
        const left = total - Math.floor((Date.now() - started) / 1000);
        if (left <= 0) {
          if (!demoMode) {
            persistReadingDoneRef.current?.(question.id);
          }
          setReadingDone((currentDone) => {
            const next = new Set(currentDone);
            next.add(question.id);
            return next;
          });
          setReadingLeft((state) => {
            const next = { ...state };
            delete next[question.id];
            return next;
          });
          clearInterval(timer);
          return;
        }
        setReadingLeft((state) => ({ ...state, [question.id]: left }));
      }, 250);
      timers.push(timer);
    }
    return () => {
      timers.forEach((timer) => clearInterval(timer));
    };
  }, [
    current?.key,
    demoMode,
    readingDone,
    initialReadingStarted,
    pageStorageKey,
  ]);
  const currentIntro = current ? (current as ToeflPage).intro : undefined;
  const toeicListeningActive = Boolean(current && isToeicListening(examType, current.section.sectionType));
  const toeicListeningScreen = toeicListeningActive && !currentIntro;
  const speakingSection = Boolean(current?.section.sectionType === "SPEAKING");
  const writingSection = Boolean(current?.section.sectionType === "WRITING");
  const toeicQuestionBlockHeading = examType === "TOEIC" && (writingSection || speakingSection);
  const speakingAutoFlow = isSpeakingAutoFlow(examType, current?.section);
  const speakingPromptAutoplay = speakingAutoFlow && speakingSection;
  const listeningLocked = toeicListeningScreen && !demoMode;
  const expired = useRef(false);
  const advanced = useRef(new Set<string>());
  const blockAdvanced = useRef(false);
  const questionAdvanced = useRef(new Set<string>());
  const focusLossMax = test.settings.focusLossMaxWarnings ?? 0;
  const audioAutoStart = Boolean(test.settings.audioAutoStart);
  const videoAutoStart = Boolean(test.settings.videoAutoStart);
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
    if (!demoMode) {
      onPersistAudioDone?.(key);
    }
    setAudioDone((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [demoMode, onPersistAudioDone]);

  const onAutoPlayBlocked = useCallback(() => setAutoPlayBlocked(true), []);

  const gateAutoPlay = (audioAutoStart || toeicListeningScreen || speakingPromptAutoplay) && !autoPlayBlocked;

  const blockExamAudio = useMemo<ExamAudioBinding | undefined>(() => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: gateAutoPlay,
      completed: audioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `block:${item.id}` : null),
      onEnded: markAudioEnded,
      onAutoPlayBlocked,
      hidden: toeicListeningScreen,
    };
  }, [examAudioOn, gateAutoPlay, audioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked, toeicListeningScreen]);

  const questionExamAudio = useCallback((questionId: string): ExamAudioBinding | undefined => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: gateAutoPlay,
      completed: audioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `question:${questionId}:${item.id}` : null),
      onEnded: markAudioEnded,
      onAutoPlayBlocked,
      hidden: toeicListeningScreen || speakingPromptAutoplay,
    };
  }, [examAudioOn, gateAutoPlay, audioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked, toeicListeningScreen, speakingPromptAutoplay]);

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
    setIntroStep(0);
  }, [current?.key]);

  const introQueue = useMemo(() => {
    if (!toeicListeningActive || !currentIntro || !current) {
      return [] as { key: string; mediaId: string }[];
    }
  if (currentIntro === "section") {
      return scopeIntroAudios(current.section, null);
    }
    return scopeIntroAudios(current.section, current.part ?? null, current.part?.example);
  }, [toeicListeningActive, currentIntro, current]);

  const finishIntroAudio = useCallback(() => {
    markAudioEnded(introQueue[introStep]?.key ?? "");
    if (introStep + 1 < introQueue.length) {
      setIntroStep((value) => value + 1);
      return;
    }
    if (!demoMode && index < pages.length - 1) {
      void (async () => {
        if (flushAnswers) {
          await flushAnswers();
        }
        setIndex(index + 1);
      })();
    }
  }, [demoMode, flushAnswers, index, introQueue, introStep, markAudioEnded, pages.length]);

  useEffect(() => {
    if (!demoMode || !toeicListeningActive || !current) {
      return;
    }
    const pageKey = current.key;
    const revisiting = demoVisitedPages.current.has(pageKey);
    demoVisitedPages.current.add(pageKey);
    if (!revisiting) {
      return;
    }
    const keys = [...gateQueue.map((item) => item.key), ...introQueue.map((item) => item.key)];
    if (!keys.length) {
      return;
    }
    setAudioDone((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    });
    setIntroStep(0);
    setListenNonce((value) => value + 1);
    setAutoPlayBlocked(false);
  }, [demoMode, toeicListeningActive, current?.key, gateQueue, introQueue]);

  useEffect(() => {
    if (demoMode || !toeicListeningActive || !currentIntro || introQueue.length > 0) {
      return;
    }
    if (index < pages.length - 1) {
      setIndex(index + 1);
    }
  }, [current?.key, currentIntro, demoMode, index, introQueue.length, pages.length, toeicListeningActive]);

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
      .filter((question) => (
        speakingAutoFlow
          ? pageInteractionReady(current, gateQueue, audioDone, readingDone, question)
          : questionAudioReady(gateQueue, audioDone, question)
      ))
      .map((question) => question.id);
    if (readyIds.length) {
      onEnterQuestions?.(readyIds);
    }
  }, [current?.key, gateQueue, audioDone, readingDone, gateActiveKey, speakingAutoFlow, toeicListeningScreen, demoMode, onEnterSection, onEnterPart, onEnterQuestions, current]);

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
    if (demoMode || !current || currentIntro) {
      return;
    }
    const toeicListen = toeicListeningScreen;
    if (!toeicListen && !autoAdvanceOnQuestionTimeout) {
      return;
    }
    if (toeicListen && gateActiveKey !== null) {
      return;
    }
    const pageTimed = (questionId: string) => Boolean(
      current.questions.find((item) => item.id === questionId)?.settings.timeLimitSeconds,
    );
    const expiredIds = current.questions
      .filter((question) => {
        if (!pageTimed(question.id)) {
          return false;
        }
        const left = questionLeft(question.id);
        return left !== null && left <= 0 && !questionAdvanced.current.has(question.id);
      })
      .map((question) => question.id);
    if (!expiredIds.length) {
      return;
    }
    expiredIds.forEach((id) => questionAdvanced.current.add(id));
    const allTimedDone = current.questions.every((question) => {
      if (!pageTimed(question.id)) {
        return true;
      }
      const left = questionLeft(question.id);
      return left !== null && left <= 0;
    });
    if (allTimedDone && index < pages.length - 1 && !speakingAutoFlow) {
      void (async () => {
        if (!demoMode && flushAnswers) {
          await flushAnswers();
        }
        setIndex(index + 1);
      })();
    }
  }, [now, current?.key, currentIntro, autoAdvanceOnQuestionTimeout, demoMode, gateActiveKey, speakingAutoFlow, toeicListeningScreen, index, pages.length, flushAnswers, current]);

  const canGoTo = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pages.length) {
      return false;
    }
    if (listeningLocked) {
      return targetIndex === index;
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
  };

  const advanceTo = useCallback((next: number) => {
    void (async () => {
      if (!demoMode && flushAnswers) {
        await flushAnswers();
      }
      go(next);
    })();
  }, [demoMode, flushAnswers, go]);

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
  const headerAudio = toeicListeningActive ? [] : [...feedAudioItems(sectionFeed), ...feedAudioItems(partFeed)];
  const sideSectionFeed = withoutAudio(sectionFeed);
  const sidePartFeed = withoutAudio(partFeed);
  const splitWorkspace = feedHasSideContent(sideSectionFeed) || feedHasSideContent(sidePartFeed);
  const toeicGroupSplit = toeicMaterialGroupLayout(examType, current?.block ?? null, {
    questionCount: current?.questions.length,
  });
  const toeicGroupQuestionPane = toeicGroupSplit && Boolean(current?.block);
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

  const hidePartInstructionsOnQuestions = Boolean(
    current?.part && examType === "CUSTOM" && partExampleFilled(current.part.example),
  );
  const scopeHeading = (key: string) => (current && examType !== "TOEIC" ? (
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
      {hasPartInstr && partInstructions && !hidePartInstructionsOnQuestions ? (
        <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
          <PromptView doc={partInstructions} />
        </Box>
      ) : null}
    </Stack>
  ) : null);

  const stepForward = (next: number) => {
    go(next);
  };

  const onChromeNext = async () => {
    if (checking) {
      return;
    }
    const stayed = await checkCurrentPage();
    if (stayed) {
      return;
    }
    if (index < pages.length - 1) {
      stepForward(index + 1);
    } else {
      setConfirming(true);
    }
  };

  const navGroups = useMemo(() => buildNavGroups(pages), [pages]);

  const goNavPage = (page: RunnerPage) => {
    const pageIndex = pages.indexOf(page);
    if (pageIndex < 0 || !canGoTo(pageIndex)) {
      return;
    }
    setFocusSlot(page.count > 0 ? page.start : null);
    go(pageIndex);
  };

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

  const toeicDemoNav = demoMode && examType === "TOEIC" ? (
    <RunnerDemoQuestionNav
      pages={pages}
      current={current}
      answers={answers}
      examType={examType}
      numberFormat={numberFormat}
      focusSlot={focusSlot}
      canGoTo={canGoTo}
      onGoToPage={goNavPage}
      onGoToSlot={goToSlot}
    />
  ) : null;

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
                          const focused = page.key === current?.key
                            && focusSlot !== null
                            && focusSlot >= unit.start
                            && focusSlot <= unit.end;
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

  const renderBlockInstructions = (block: NonNullable<typeof current>["block"]) => {
    if (!block) {
      return null;
    }
    const blockInstructions = toInstructionDoc(block.instructions);
    if (!instructionHasContent(blockInstructions)) {
      return null;
    }
    return (
      <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
        <PromptView doc={blockInstructions} />
      </Box>
    );
  };

  const renderBlockPanel = (
    block: NonNullable<typeof current>["block"],
    options?: { includeInstructions?: boolean; groupPassage?: boolean },
  ) => {
    if (!block) {
      return null;
    }
    const includeInstructions = options?.includeInstructions !== false;
    const items = blockItems(block);
    const hideBlockTaskAudio = toeicListeningScreen;
    const blockFeedItems = hideBlockTaskAudio
      ? items.filter((item) => !(item.kind === "audio" && item.mediaId))
      : items;
    const filled = blockFeedItems.some(contentItemFilled);
    const blockInstructions = toInstructionDoc(block.instructions);
    const hasInstructions = includeInstructions && instructionHasContent(blockInstructions);
    if (!hasInstructions && !filled) {
      return null;
    }
    const groupPassage = Boolean(options?.groupPassage);
    return (
      <Stack key={`block-panel-${block.id}`} gap="sm" w="100%">
        {hasInstructions ? (
          <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
            <PromptView doc={blockInstructions} />
          </Box>
        ) : null}
        {filled ? (
          <Box
            className={
              groupPassage && examType === "TOEIC"
                ? "iba-test-copy runner-toeic-group-passage-content"
                : "iba-test-copy"
            }
            style={
              shouldFrameContentItems(blockFeedItems, examType)
                ? {
                    ...passageFrameStyle,
                    ...(examType === "TOEIC"
                      ? {
                        width: "100%",
                        marginInline: 0,
                        ...(groupPassage ? { boxSizing: "border-box" as const } : null),
                      }
                      : null),
                  }
                : undefined
            }
          >
            <ContentFeedView
              items={blockFeedItems}
              examAudio={hideBlockTaskAudio ? undefined : blockExamAudio}
              hideAudio={hideBlockTaskAudio}
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
        const suppressQuestionsRangeHeading = examType === "TOEIC" || examType === "TOEFL";
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
          if (suppressQuestionsRangeHeading) {
            return;
          }
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
        if (current.block && !toeicGroupSplit) {
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
          const speakingQuestion = engineOf(question.type) === "SPEAKING";
          const readingSeconds = questionReadingSeconds(question);
          const readingActive = readingSeconds > 0 && !readingDone.has(question.id);
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
              {audioPending && examType !== "TOEIC" ? (
                <SettingsHint>The timer starts after the audio</SettingsHint>
              ) : null}
              {qLeft !== null && qLeft > 0 && examType !== "TOEIC" ? (
                <Countdown label="Question" seconds={qLeft} />
              ) : null}
              {qLocked && examType !== "TOEIC" ? (
                <Alert color="yellow" variant="light" p="xs">Time for this question is up</Alert>
              ) : null}
              <QuestionPlayer
                question={question}
                kicker={formatQuestionRange(questionStart, count, numberFormat)}
                answer={answers[question.id] ?? {}}
                onAnswer={(answer) => handleAnswer(question.id, answer)}
                readOnly={!demoMode && (pageReadOnly || (qLocked && !speakingQuestion))}
                startNumber={questionStart}
                numberFormat={numberFormat}
                examType={examType}
                examAudio={questionExamAudio(question.id)}
                hideQuestionsHeading={
                  suppressQuestionsRangeHeading || Boolean(groupHeading && ownHeading === groupHeading)
                }
                questionBlockHeading={
                  toeicQuestionBlockHeading
                    ? toeflQuestionBlockHeading(questionStart, count)
                    : undefined
                }
                hideBlankNumbers
                parenLetters
                headingBelowInstructions={speakingAutoFlow}
                autoPlayTaskVideo={shouldAutoPlayQuestionTaskVideo(
                  false,
                  question,
                  speakingAutoFlow,
                  videoAutoStart,
                )}
                speakingAutoFlow={speakingAutoFlow}
                speakingPromptReady={speakingPromptCanStart(current, question, audioDone, readingDone, demoMode)}
                speakingReadingRemaining={
                  speakingAutoFlow && speakingQuestion && readingActive
                    ? (readingLeft[question.id] ?? readingSeconds)
                    : undefined
                }
                onSpeakingComplete={() => {
                  if (index < pages.length - 1) {
                    advanceTo(index + 1);
                  }
                }}
                demoMode={demoMode}
                toeicGroupPane={toeicGroupQuestionPane}
                hideTaskAudio={toeicListeningScreen}
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

  const introAudio = introQueue[introStep] ?? null;
  const gateActiveItem = gateQueue.find((item) => item.key === gateActiveKey) ?? null;
  const demoPendingAudio = demoMode && toeicListeningActive && (
    Boolean(introAudio && currentIntro)
    || gateQueue.some((item) => !audioDone.has(item.key))
  );
  const skipDemoAudio = () => {
    gateQueue.forEach((item) => {
      if (!audioDone.has(item.key)) {
        markAudioEnded(item.key);
      }
    });
    introQueue.forEach((item) => {
      if (!audioDone.has(item.key)) {
        markAudioEnded(item.key);
      }
    });
    if (currentIntro) {
      setIntroStep(introQueue.length);
    }
    setAutoPlayBlocked(false);
  };
  const hiddenGateAudio = toeicListeningScreen && gateActiveItem ? (
    <Box style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
      <LimitedAudio
        key={`${current?.key}-${gateActiveItem.key}-${listenNonce}`}
        src={media.asset(gateActiveItem.mediaId)}
        limit={0}
        label="Audio"
        locked
        playEnabled
        autoPlay={gateAutoPlay}
        onEnded={() => markAudioEnded(gateActiveItem.key)}
        onAutoPlayBlocked={onAutoPlayBlocked}
      />
    </Box>
  ) : null;
  const introAudioNode = toeicListeningActive && introAudio && currentIntro ? (
    <Box style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
      <LimitedAudio
        key={`${current?.key}-intro-${introStep}-${listenNonce}`}
        src={media.asset(introAudio.mediaId)}
        limit={0}
        label="Instructions"
        locked
        playEnabled
        autoPlay={!autoPlayBlocked}
        onEnded={finishIntroAudio}
        onAutoPlayBlocked={onAutoPlayBlocked}
      />
    </Box>
  ) : null;
  const demoSkipNode = demoPendingAudio ? (
    <Button
      className="runner-toefl-timer-toggle runner-toefl-skip-audio"
      variant="subtle"
      size="compact-sm"
      onClick={skipDemoAudio}
      styles={{ root: { color: "var(--mantine-color-white)", fontWeight: 600 } }}
    >
      Skip audio
    </Button>
  ) : null;
  const toeicHeaderCenter = demoPendingAudio ? demoSkipNode : headerAudioNode;

  const audioListenBanner = examAudioOn && (audioAutoStart || toeicListeningScreen) && autoPlayBlocked && gateActiveKey ? (
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
    : (demoMode && current?.section && limitSecondsFromSection(current.section) > 0 && sectionEnds[current.section.id] == null
      ? limitSecondsFromSection(current.section)
      : null);
  const partHeaderSeconds = currentPartLeft !== null
    ? currentPartLeft
    : (demoMode && current?.part && partLimitSeconds(current.part) > 0 && current.part.id && partEnds[current.part.id] == null
      ? partLimitSeconds(current.part)
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

  const toeicListeningStuck = Boolean(
    listeningLocked
    && current
    && !currentIntro
    && gateActiveKey === null
    && !screenHasTimedQuestions(current),
  );
  const introAudioPending = Boolean(
    currentIntro
    && toeicListeningActive
    && introQueue.some((item) => !audioDone.has(item.key)),
  );
  const answerSecondsLeft = current && toeicListeningScreen
    ? (() => {
        const lefts = current.questions
          .map((question) => questionLeft(question.id))
          .filter((left): left is number => left !== null && left > 0);
        return lefts.length ? Math.max(...lefts) : null;
      })()
    : null;
  const toeicQuestionHeaderSeconds = examType === "TOEIC" && current && !currentIntro && !toeicListeningScreen
    ? (() => {
        const lefts = current.questions
          .map((question) => questionLeft(question.id))
          .filter((left): left is number => left !== null && left > 0);
        return lefts.length ? Math.max(...lefts) : null;
      })()
    : null;

  const earlyFinishAction = current && !demoMode && !confirming && index < pages.length - 1 && allowEarlySubmit && !toeicListeningActive ? (
    <Group justify="flex-end" w="100%">
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
  const allowChromeNext = toeicStackedChrome
    ? toeflAllowChromeNext({
      demoMode,
      speakingAutoFlow,
      listeningLocked,
      intro: currentIntro,
      introAudioCount: introQueue.length,
      groupContent: Boolean((current as ToeflPage | undefined)?.groupContent),
      examAudioOn,
      earlyNextInGroup: false,
      earlyNextListening: false,
    })
    : !introAudioPending;
  const showBack = showRunnerBack(index, canGoTo);
  const showForward = listeningLocked
    ? toeicListeningStuck
    : showRunnerForward(index, pages.length, canGoTo, allowChromeNext, demoMode);
  const showChromeNav = showBack || showForward;
  const pageNav = current && !confirming && showChromeNav ? (
    <Stack gap="sm" className="runner-toeic-page-nav-slot" w="100%">
      <Group justify="flex-end" gap="md" wrap="nowrap">
        {showBack ? (
          <Button size="md" variant="default" onClick={() => go(index - 1)}>
            Back
          </Button>
        ) : null}
        {showForward ? (
          <Button size="md" color="iba" onClick={onChromeNext}>
            {index < pages.length - 1 ? "Next" : "Finish"}
          </Button>
        ) : null}
      </Group>
    </Stack>
  ) : null;
  const toeicTaskCardFooter = toeicStackedChrome
    ? (demoMode ? pageNav ?? undefined : earlyFinishAction ?? undefined)
    : undefined;

  const toeicNavInRightColumn = toeicStackedChrome && !demoMode && Boolean(pageNav);
  const submitSummary = unansweredSlots === 0
    ? "You have answered all the questions. You will not be able to change your answers after submitting."
    : `Unanswered: ${unansweredSlots}/${totalSlotsCount}. You will not be able to change your answers after submitting.`;
  const finishPanel = (
    <Stack
      gap="md"
      w="100%"
      maw="var(--runner-toefl-centered-pane-max)"
      mx="auto"
      py="sm"
      px="md"
    >
      <Text
        fw={700}
        ta="center"
        style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
      >
        Submit your answers?
      </Text>
      <Text size="md" ta="center">
        {submitSummary}
      </Text>
      {submitError ? (
        <Alert color="red" variant="light" role="alert">
          {submitError}
        </Alert>
      ) : null}
      <Group justify="center" gap="md" wrap="nowrap" w="100%">
        <Button
          size="md"
          variant="default"
          disabled={submitting}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
        <Button size="md" color="iba" loading={submitting} onClick={onSubmit}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </Group>
    </Stack>
  );
  const toeicFinishPane = (
    <RunnerScrollPane
      className="runner-page-body"
      variant="embed"
      style={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}
    >
      <Box
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {finishPanel}
      </Box>
    </RunnerScrollPane>
  );
  const headerScopeTitle = confirming && toeicStackedChrome
    ? "Submit"
    : current ? (() => {
    if (examType === "TOEIC") {
      const intro = (current as ToeflPage).intro;
      if (intro === "part") {
        return current.part?.title?.trim() || current.part?.title || current.section.title;
      }
      if (intro === "section") {
        return current.section.title?.trim() || current.section.title;
      }
      const resolved = resolveChromeProgressPage(pages, index, current, numberScope);
      const total = scopeSlotTotal(pages, current, numberScope);
      return toeflChromeProgress(current.section, resolved, total);
    }
    const intro = (current as ToeflPage).intro;
    if (intro === "section") {
      return current.section.title;
    }
    if (intro === "part") {
      return current.part?.title ?? current.section.title;
    }
    return current.part?.title || current.section.title;
  })() : "";
  const headerLeading = current ? (
    <Text
      fw={600}
      style={{
        fontSize: "var(--type-body, 1rem)",
        lineHeight: "var(--mantine-line-height-md)",
        whiteSpace: "nowrap",
      }}
    >
      {headerScopeTitle}
    </Text>
  ) : null;
  const headerTimerDigits = (
    <>
      {sectionHeaderSeconds !== null && sectionHeaderSeconds > 0 ? (
        <Countdown label="Section" seconds={sectionHeaderSeconds} digitsOnly onDark={toeicStackedChrome} />
      ) : null}
      {partHeaderSeconds !== null && partHeaderSeconds > 0 ? (
        <Countdown label="Part" seconds={partHeaderSeconds} digitsOnly onDark={toeicStackedChrome} />
      ) : null}
      {toeicQuestionHeaderSeconds !== null && toeicQuestionHeaderSeconds > 0 ? (
        <Countdown label="Question" seconds={toeicQuestionHeaderSeconds} digitsOnly onDark={toeicStackedChrome} />
      ) : null}
      {testLeft !== null ? (
        <Countdown label="Test" seconds={testLeft} digitsOnly onDark={toeicStackedChrome} />
      ) : null}
      {answerSecondsLeft !== null && answerSecondsLeft > 0 ? (
        <Countdown label="Answer" seconds={answerSecondsLeft} digitsOnly onDark={toeicStackedChrome} />
      ) : null}
    </>
  );
  const headerTimers = toeicStackedChrome ? (
    <Group gap="md" wrap="nowrap">
      {timersVisible ? headerTimerDigits : null}
      <Button
        className="runner-toefl-timer-toggle"
        variant="subtle"
        size="compact-sm"
        onClick={() => setTimersVisible((visible) => !visible)}
        aria-label={timersVisible ? "Hide timer" : "Show timer"}
        aria-pressed={!timersVisible}
        leftSection={(
          <Box component="span" style={{ display: "flex", "--psi-icon-size": "16px" } as CSSProperties}>
            <PasswordVisibilityIcon reveal={!timersVisible} />
          </Box>
        )}
        styles={{
          root: {
            color: "var(--mantine-color-white)",
            fontWeight: 600,
          },
        }}
      >
        {timersVisible ? "Hide Timer" : "Show Timer"}
      </Button>
    </Group>
  ) : headerTimerDigits;
  const placeDemoNav = (content: React.ReactNode, options?: { navInRightColumn?: boolean }) => {
    if (toeicStackedChrome && demoMode) {
      return content;
    }
    if (toeicNavInRightColumn && options?.navInRightColumn) {
      return content;
    }
    return withDemoPageNav(demoMode, pageNav, content);
  };
  const introPane = currentIntro ? placeDemoNav(
    <Stack gap="xl" w="100%" style={{ flex: 1, minHeight: 0 }}>
      <Text
        fw={700}
        ta={toeicStackedChrome ? "center" : undefined}
        style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
      >
        {currentIntro === "section" ? current.section.title : (current.part?.title ?? "")}
      </Text>
      {currentIntro === "section" && hasSectionInstr && sectionInstructions ? (
        <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
          <PromptView doc={sectionInstructions} />
        </Box>
      ) : null}
      {currentIntro === "part" && hasPartInstr && partInstructions ? (
        examType === "TOEIC" ? (
          <ScopeInstructionView doc={partInstructions} examType={examType} scope="part" />
        ) : (
          <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
            <PromptView doc={partInstructions} />
          </Box>
        )
      ) : null}
      {currentIntro === "part" ? (
        <PartExampleView example={current.part?.example} hideAudio={toeicListeningActive} framed={examType !== "TOEIC"} />
      ) : null}
    </Stack>
  ) : null;
  const taskPane = current ? (
    introPane ?? placeDemoNav(
      toeicGroupSplit && current.block ? (
        <Box
          className="runner-question-split runner-question-split--toeic-group"
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "grid",
            gap: "var(--runner-toeic-column-gap)",
            alignItems: "start",
            overflow: "hidden",
          }}
        >
          <RunnerScrollPane
            className="runner-group-passage"
            variant="embed"
            style={{ minHeight: 0, height: "100%", alignSelf: "stretch" }}
          >
            {renderBlockPanel(current.block, { includeInstructions: false, groupPassage: true })}
          </RunnerScrollPane>
          <ToeicRightColumnWithNav
            nav={pageNav}
            showNav={toeicNavInRightColumn}
            navClassName="runner-toeic-page-nav-slot--group"
          >
            <RunnerScrollPane
              className="runner-question-pane"
              variant="embed"
              style={{ minHeight: 0, minWidth: 0, width: "100%" }}
            >
              <Stack gap="sm" className="runner-toeic-group-questions">
                {renderBlockInstructions(current.block)}
                {questionStack}
              </Stack>
            </RunnerScrollPane>
          </ToeicRightColumnWithNav>
        </Box>
      ) : splitWorkspace ? (
        <Box
          className="runner-workspace-split runner-toeic-workspace-split"
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--grid-gutter)",
            alignItems: toeicStackedChrome ? "start" : "stretch",
            overflow: "hidden",
          }}
        >
          <RunnerScrollPane className="runner-reading" style={toeicStackedChrome ? { height: "100%", alignSelf: "stretch" } : undefined}>
            <Stack gap="md">
              {feedHasSideContent(sideSectionFeed) ? <ContentFeedView items={sideSectionFeed} /> : null}
              {feedHasSideContent(sidePartFeed) ? <ContentFeedView items={sidePartFeed} /> : null}
            </Stack>
          </RunnerScrollPane>
          <ToeicRightColumnWithNav nav={pageNav} showNav={toeicNavInRightColumn && toeicStackedChrome}>
            <RunnerScrollPane className="runner-questions" style={{ minHeight: 0, minWidth: 0, width: "100%" }}>
              <Stack gap={8}>
                {scopeHeading("questions")}
                {questionStack}
              </Stack>
            </RunnerScrollPane>
          </ToeicRightColumnWithNav>
        </Box>
      ) : (
        <Stack gap={8} style={{ flex: 1, minHeight: 0 }}>
          {scopeHeading("main")}
          {questionStack}
        </Stack>
      ),
      { navInRightColumn: Boolean(toeicGroupSplit && current.block) || (toeicStackedChrome && splitWorkspace) },
    )
  ) : null;

  const runnerModals = (
    <>
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
      {confirming && !toeicStackedChrome && (
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
          {submitSummary}
        </ConfirmDialog>
      )}
    </>
  );

  if (toeicStackedChrome) {
    return (
      <Box
        ref={top}
        data-runner-layout="toeic"
        style={{
          minHeight: "100vh",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-page)",
          overflow: "hidden",
        }}
      >
        <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ToeflTakeShell
            layout="toeic"
            embedded
            fillHeight
            cardFooter={toeicTaskCardFooter}
            demoNav={toeicDemoNav}
            headerCenter={toeicHeaderCenter}
            headerLeading={headerLeading}
            headerChildren={headerTimers}
            beforeWorkspace={(
              <>
                {alerts}
                {audioListenBanner}
                {hiddenGateAudio}
                {introAudioNode}
              </>
            )}
          >
            {confirming ? toeicFinishPane : taskPane}
          </ToeflTakeShell>
        </Box>
        {runnerModals}
        <style>{`
        .runner-toefl-chrome .runner-toefl-timer-toggle:hover {
          background: color-mix(in srgb, var(--mantine-color-white) 14%, transparent) !important;
          color: var(--mantine-color-white) !important;
        }
        .runner-toefl-chrome .runner-toefl-timer-toggle:active {
          background: color-mix(in srgb, var(--mantine-color-white) 22%, transparent) !important;
        }
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
        {headerTimers}
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
        {current && splitWorkspace ? taskPane : null}
        {current && !splitWorkspace ? (
          <Card maw={920} w="100%" mx="auto" shadow="sm" bg="white" className="runner-task-card" style={{ flex: "none" }}>
            {taskPane}
          </Card>
        ) : null}
      </Box>
      {numberStrip}
      {runnerModals}
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

function groupSlotProgress(
  group: { pages: RunnerPage[] },
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
