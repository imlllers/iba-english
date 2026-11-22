import { Alert, Box, Button, Card, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AnswerData, ContentItem, Doc, PublicQuestion } from "@/entities/question/types";
import { errorExplanationsEnabled, normalizeQuestionNumberFormat } from "@/entities/test/settings";
import {
  formatQuestionRange,
  isSlotAnswered,
  questionSlotCount,
} from "@/features/question-types/numbering";
import { ContentFeedView, type ExamAudioBinding } from "@/features/question-types/content/ContentFeedView";
import { blockItems, contentItemFilled, scopeItems } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { passageFrameStyle, shouldFrameContentItems } from "@/features/question-types/content/passageFrame";
import { LimitedAudio, ListenFallbackButton } from "@/features/question-types/media/LimitedAudio";
import { useMedia } from "@/features/question-types/media/MediaContext";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { QuestionPlayer, isAnswered } from "@/features/question-types/QuestionPlayer";
import { engineOf } from "@/features/question-types/registry";
import { useNow } from "@/shared/lib/useNow";
import { limitSecondsFromSection } from "@/shared/lib/durationMmSs";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PasswordVisibilityIcon } from "@/shared/ui/PasswordVisibilityIcon";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { Countdown } from "../../Countdown";
import {
  activeGateKey,
  groupBlockAudioReady,
  pageGateAudios,
  questionAudioReady,
  questionTimerReady,
  speakingPromptCanStart,
} from "../../pageAudioGate";
import { partLimitSeconds } from "../../partTiming";
import { pageInteractionReady, partTimerReady } from "../../partTimerGate";
import { pageReadingPending, questionReadingSeconds } from "../../readingPhase";
import { buildRunnerPages, type RunnerPage } from "../../runnerPages";
import {
  blockHasAudio,
  blockHasSideText,
  blockHasVisualMedia,
  excludeBlockAudioFromGate,
  isListening,
  withIntroPages,
  type ToeflPage,
} from "./toeflPages";
import {
  blockSideContentForQuestion,
  filterBlockItemsWithoutGroupVisual,
} from "./resolveQuestionVisual";
import { shouldAutoPlayQuestionTaskVideo } from "./questionTaskVideo";
import { resolveChromeProgressPage, scopeSlotTotal, toeflChromeProgress } from "./toeflChromeProgress";
import { toeflFullWidthQuestionPane, toeflPageInstructionDoc } from "./toeflPageInstruction";
import { publicApi } from "../../publicApi";
import { TakeHeader } from "../../TakeHeader";
import { useFocusLossGuard } from "../../useFocusLossGuard";
import { usePersistentPageIndex } from "../../usePersistentPageIndex";
import { navUnits } from "../../navUnits";
import { showRunnerBack, showRunnerForward } from "../../runnerChromeNav";
import { canGoToToeflPage, needsToeflForwardConfirm, toeflAllowChromeNext } from "./toeflNavigation";
import type { TestRunnerProps } from "../../runnerTypes";
import { RunnerScrollPane } from "../../RunnerScrollPane";

function leftSeconds(end: string | null | undefined, now: number) {
  return end ? Math.ceil((new Date(end).getTime() - now) / 1000) : null;
}

function feedAudioItems(items: ContentItem[]) {
  return items.filter((item) => item.kind === "audio" && item.mediaId);
}

export function ToeflRunner(props: TestRunnerProps) {
  const {
    test, answers, onAnswer, saveError, expiresAt, blockEndsAt = null, sectionEnds,
    partEnds = {}, questionEnds = {},
    onEnterSection, onEnterPart, onPausePart, onResumePart, onEnterQuestions,
    onSubmit, onExpire, onFocusLossExhausted, focusLossStorageKey, pageStorageKey,
    submitting, submitError, attemptToken,     demoMode = false,
    initialAudioDone = [], onPersistAudioDone, flushAnswers,
    initialReadingStarted = {}, initialReadingDone = [],
    onPersistReadingStart, onPersistReadingDone,
  } = props;
  const media = useMedia();
  const oneQuestionPerPage = true;
  const explanationMode = errorExplanationsEnabled(test.settings.examType)
    ? test.settings.errorExplanationMode ?? "off"
    : "off";
  const checkOnLeave = Boolean(attemptToken)
    && (explanationMode === "during" || explanationMode === "both");
  const numberScope = test.settings.questionNumberScope ?? "test";
  const examType = test.settings.examType ?? "CUSTOM";
  const pages = useMemo(
    () => withIntroPages(buildRunnerPages(test.sections, { oneQuestionPerPage, numberScope, examType }), examType),
    [test.sections, oneQuestionPerPage, numberScope, examType],
  );
  const totalSlotsCount = pages.reduce((sum, page) => sum + page.count, 0);
  const [index, setIndex] = usePersistentPageIndex(pages, pageStorageKey);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [forwardConfirm, setForwardConfirm] = useState(false);
  const [sessionAudioDone, setSessionAudioDone] = useState(() => new Set(initialAudioDone));
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [listenNonce, setListenNonce] = useState(0);
  const [audioDurationTick, setAudioDurationTick] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [revealedPageKey, setRevealedPageKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [timersVisible, setTimersVisible] = useState(true);
  const [wordCountVisible, setWordCountVisible] = useState(true);
  const top = useRef<HTMLDivElement>(null);
  const demoVisitedPages = useRef(new Set<string>());
  const groupGateBeforeClear = useRef<string | null>(null);
  const timed = Boolean(expiresAt)
    || Boolean(blockEndsAt)
    || Object.values(sectionEnds).some(Boolean)
    || Object.values(partEnds).some(Boolean)
    || Object.values(questionEnds).some(Boolean);
  const now = useNow(timed);
  const current = pages[Math.min(index, pages.length - 1)];
  const expired = useRef(false);
  const advanced = useRef(new Set<string>());
  const partAdvanced = useRef(new Set<string>());
  const blockAdvanced = useRef(false);
  const questionAdvanced = useRef(new Set<string>());
  const readingStartedAnnounced = useRef(new Set(Object.keys(initialReadingStarted)));
  const focusLossMax = test.settings.focusLossMaxWarnings ?? 0;
  const audioAutoStart = Boolean(test.settings.audioAutoStart);
  const videoAutoStart = Boolean(test.settings.videoAutoStart);
  const allowEarlySubmit = test.settings.allowEarlySubmit !== false;
  const autoAdvanceOnQuestionTimeout = Boolean(test.settings.autoAdvanceOnQuestionTimeout);
  const autoAdvanceOnPartTimeout = Boolean(test.settings.autoAdvanceOnPartTimeout);
  const pausePartTimerDuringAudio = Boolean(test.settings.pausePartTimerDuringAudio);
  const [readingDone, setReadingDone] = useState(() => new Set(initialReadingDone));
  const [readingLeft, setReadingLeft] = useState<Record<string, number>>({});
  const [readingTick, setReadingTick] = useState(0);
  const timedSectionTypes = test.settings.timeLimitSectionTypes ?? [];
  const numberFormat = normalizeQuestionNumberFormat(test.settings.questionNumberFormat);
  const focusGuard = useFocusLossGuard({
    enabled: focusLossMax > 0 && Boolean(onFocusLossExhausted),
    maxWarnings: focusLossMax > 0 ? focusLossMax : 1,
    storageKey: focusLossStorageKey ?? "iba-focus-loss",
    onExhausted: () => onFocusLossExhausted?.(),
  });

  const listening = Boolean(current && isListening(current));
  const speaking = Boolean(current?.section.sectionType === "SPEAKING");
  const listeningLocked = listening && !demoMode;
  const readingBlocksAudio = Boolean(current && pageReadingPending(current.questions, readingDone));
  const gateQueue = useMemo(
    () => (current
      ? pageGateAudios(current).filter((item) => !(excludeBlockAudioFromGate(current as ToeflPage) && item.scope === "block"))
      : []),
    [current],
  );
  const gateActiveKey = activeGateKey(gateQueue, sessionAudioDone);
  const examAudioOn = gateQueue.length > 0;

  const markAudioEnded = useCallback((key: string) => {
    if (!demoMode) {
      onPersistAudioDone?.(key);
    }
    setSessionAudioDone((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [demoMode, onPersistAudioDone]);

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

  const onAutoPlayBlocked = useCallback(() => setAutoPlayBlocked(true), []);

  const blockExamAudio = useMemo<ExamAudioBinding | undefined>(() => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: (audioAutoStart || listening || speaking) && !autoPlayBlocked && !readingBlocksAudio,
      completed: sessionAudioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `block:${item.id}` : null),
      onEnded: markAudioEnded,
      onDurationKnown: () => setAudioDurationTick((value) => value + 1),
      onAutoPlayBlocked,
      hidden: listening || speaking,
    };
  }, [examAudioOn, audioAutoStart, listening, speaking, readingBlocksAudio, autoPlayBlocked, sessionAudioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked]);

  const questionExamAudio = useCallback((questionId: string): ExamAudioBinding | undefined => {
    if (!examAudioOn) {
      return undefined;
    }
    return {
      locked: true,
      autoPlay: (audioAutoStart || listening || speaking) && !autoPlayBlocked && !readingBlocksAudio,
      completed: sessionAudioDone,
      activeKey: gateActiveKey,
      remountToken: listenNonce,
      keyFor: (item) => (item.kind === "audio" && item.mediaId ? `question:${questionId}:${item.id}` : null),
      onEnded: markAudioEnded,
      onDurationKnown: () => setAudioDurationTick((value) => value + 1),
      onAutoPlayBlocked,
      hidden: listening || speaking,
    };
  }, [examAudioOn, audioAutoStart, listening, speaking, readingBlocksAudio, autoPlayBlocked, sessionAudioDone, gateActiveKey, listenNonce, markAudioEnded, onAutoPlayBlocked]);

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

  const canGoTo = useCallback((targetIndex: number) => {
    if (demoMode) {
      return targetIndex >= 0 && targetIndex < pages.length;
    }
    return canGoToToeflPage(pages, index, targetIndex, test.settings, listeningLocked);
  }, [demoMode, pages, index, test.settings, listeningLocked]);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    if (!canGoTo(clamped)) {
      return;
    }
    setIndex(clamped);
    top.current?.scrollTo({ top: 0 });
  }, [canGoTo, pages.length]);

  const advanceTo = useCallback((next: number) => {
    void (async () => {
      if (!demoMode && flushAnswers) {
        await flushAnswers();
      }
      go(next);
    })();
  }, [demoMode, flushAnswers, go]);

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

  useEffect(() => {
    if (!demoMode || !current) {
      return;
    }
    const pageKey = current.key;
    const revisiting = demoVisitedPages.current.has(pageKey);
    demoVisitedPages.current.add(pageKey);
    if (!revisiting) {
      return;
    }
    const toeflPage = current as ToeflPage;
    const fullQueue = pageGateAudios(current);
    const pageQueue = fullQueue.filter((item) => !(excludeBlockAudioFromGate(toeflPage) && item.scope === "block"));
    const toClear = toeflPage.groupContent ? fullQueue.map((item) => item.key) : pageQueue.map((item) => item.key);
    if (toClear.length === 0) {
      return;
    }
    setSessionAudioDone((prev) => {
      const next = new Set(prev);
      for (const key of toClear) {
        next.delete(key);
      }
      return next;
    });
    setListenNonce((value) => value + 1);
    setAutoPlayBlocked(false);
  }, [demoMode, current?.key]);

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
    if (!current || demoMode) {
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
        onPersistReadingStart?.(question.id);
      }
      const started = initialReadingStarted[question.id]
        ? new Date(initialReadingStarted[question.id]).getTime()
        : Date.now();
      const timer = setInterval(() => {
        const left = total - Math.floor((Date.now() - started) / 1000);
        if (left <= 0) {
          onPersistReadingDone?.(question.id);
          setReadingDone((currentDone) => {
            const next = new Set(currentDone);
            next.add(question.id);
            return next;
          });
          setReadingLeft((current) => {
            const next = { ...current };
            delete next[question.id];
            return next;
          });
          setReadingTick((value) => value + 1);
          clearInterval(timer);
          return;
        }
        setReadingLeft((current) => ({ ...current, [question.id]: left }));
        setReadingTick((value) => value + 1);
      }, 250);
      timers.push(timer);
    }
    return () => {
      timers.forEach((timer) => clearInterval(timer));
    };
  }, [current?.key, demoMode, readingDone, initialReadingStarted, onPersistReadingDone, onPersistReadingStart]);

  useEffect(() => {
    if (!current) {
      return;
    }
    onEnterSection(current.section.id);
    if (current.part?.id && partTimerReady(current, gateQueue, sessionAudioDone, readingDone)) {
      onEnterPart?.(current.part.id);
    }
    const readyIds = current.questions
      .filter((question) => {
        if (!pageInteractionReady(current, gateQueue, sessionAudioDone, readingDone, question)) {
          return false;
        }
        if (demoMode && listening && !current.groupContent && question.settings.timeLimitSeconds) {
          if (current.listenedBlockMediaOnly) {
            return true;
          }
        }
        return questionTimerReady(current, gateQueue, sessionAudioDone, question);
      })
      .map((question) => question.id);
    if (readyIds.length) {
      onEnterQuestions?.(readyIds);
    }
  }, [current?.key, gateQueue, sessionAudioDone, readingDone, readingTick, demoMode, listening, onEnterSection, onEnterPart, onEnterQuestions]);

  useEffect(() => {
    if (demoMode || !pausePartTimerDuringAudio || !current?.part?.id) {
      return;
    }
    const partId = current.part.id;
    const timerActive = partEnds[partId] != null;
    const holdTimer = Boolean(gateActiveKey)
      || current.questions.some(
        (question) => questionReadingSeconds(question) > 0 && !readingDone.has(question.id),
      );
    if (!timerActive) {
      return;
    }
    if (holdTimer) {
      const readingPending = current.questions.find(
        (question) => questionReadingSeconds(question) > 0 && !readingDone.has(question.id),
      );
      const meta = gateActiveKey
        ? { audioKey: gateActiveKey }
        : readingPending
          ? { audioKey: `reading:${readingPending.id}` }
          : undefined;
      if (meta) {
        onPausePart?.(partId, meta);
      }
    } else {
      onResumePart?.(partId);
    }
  }, [
    current?.key,
    current?.questions,
    demoMode,
    gateActiveKey,
    pausePartTimerDuringAudio,
    partEnds,
    readingDone,
    audioDurationTick,
    onPausePart,
    onResumePart,
  ]);

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
    if (demoMode || !current?.part?.id || partLeft(current.part.id) === null || (partLeft(current.part.id) ?? 1) > 0) {
      return;
    }
    if ((!current.part.autoAdvanceOnTimeout && !autoAdvanceOnPartTimeout) || partAdvanced.current.has(current.part.id)) {
      return;
    }
    partAdvanced.current.add(current.part.id);
    const next = pages.findIndex((page, pageIndex) => {
      if (pageIndex <= index) {
        return false;
      }
      if (page.section.id !== current.section.id) {
        return true;
      }
      return (page.part?.id ?? null) !== (current.part?.id ?? null);
    });
    if (next >= 0) {
      advanceTo(next);
    }
  }, [now, current?.key, current?.part?.id, autoAdvanceOnPartTimeout, demoMode, index, pages, advanceTo]);

  useEffect(() => {
    if (demoMode || (!autoAdvanceOnQuestionTimeout && !listening) || !current) {
      return;
    }
    const expiredIds = current.questions
      .filter((question) => {
        const left = questionLeft(question.id);
        return left !== null && left <= 0 && (listening || !questionAdvanced.current.has(question.id));
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
    if (allTimedDone && index < pages.length - 1 && !current.section.speakingAutoFlow) {
      advanceTo(index + 1);
    }
  }, [now, current?.key, autoAdvanceOnQuestionTimeout, listening, demoMode, index, pages.length, advanceTo]);

  useEffect(() => {
    groupGateBeforeClear.current = null;
  }, [current?.key]);

  useEffect(() => {
    if (!current?.groupContent || index >= pages.length - 1) {
      return;
    }
    if (!examAudioOn) {
      advanceTo(index + 1);
      return;
    }
    const groupQueue = current.block
      ? pageGateAudios({ ...current, block: current.block, questions: [] })
      : [];
    if (groupQueue.length > 0 && groupQueue.every((item) => sessionAudioDone.has(item.key))) {
      advanceTo(index + 1);
      return;
    }
    if (gateActiveKey) {
      groupGateBeforeClear.current = gateActiveKey;
      return;
    }
    if (groupGateBeforeClear.current) {
      groupGateBeforeClear.current = null;
      advanceTo(index + 1);
    }
  }, [current?.key, current?.groupContent, current?.block, examAudioOn, gateActiveKey, index, pages.length, sessionAudioDone, advanceTo]);

  useEffect(() => {
    setForwardConfirm(false);
  }, [index]);

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
  const primaryQuestion = current?.questions[0] ?? null;
  const blockPassageFilled = Boolean(
    current?.block
    && (current.groupContent
      ? blockHasSideText(current.block)
      : blockSideContentForQuestion(current.block, primaryQuestion)),
  );
  const blockVisualFilled = Boolean(current?.block && blockHasVisualMedia(current.block));
  const splitWorkspace = Boolean(
    current?.block
    && !current.groupContent
    && blockPassageFilled,
  );
  const splitGroupListen = Boolean(current?.groupContent && current.block && blockVisualFilled);
  const useSplitLayout = splitWorkspace || splitGroupListen;
  const stackSplitLayout = useSplitLayout && speaking;
  const pageUsesFullWidthPane = current?.questions.some(toeflFullWidthQuestionPane) ?? false;
  const centeredQuestionPane = Boolean(
    current?.block
    && !current.groupContent
    && !blockPassageFilled
    && !pageUsesFullWidthPane,
  );
  const speakingAutoFlow = Boolean(current?.section.speakingAutoFlow);
  const pageInstructionDoc = useMemo((): Doc | null => {
    if (!current || current.intro || current.groupContent) {
      return null;
    }
    return toeflPageInstructionDoc({
      blockInstructions: current.block?.instructions,
      blockItems: current.block ? blockItems(current.block) : [],
      question: current.questions[0] ?? null,
      inBlockContext: Boolean(current.block),
      questionPage: true,
    });
  }, [current]);
  const elevatedPageInstruction = pageInstructionDoc != null;
  const introQueue = listening && current?.intro
    ? feedAudioItems(current.intro === "section" ? sectionFeed : partFeed)
    : [];
  const introAudio = introQueue[introStep] ?? null;
  const finishIntroAudio = () => {
    if (introStep + 1 < introQueue.length) {
      setIntroStep(introStep + 1);
    } else if (index < pages.length - 1) {
      go(index + 1);
    }
  };
  const demoPendingAudio = demoMode && (
    Boolean(introAudio)
    || gateQueue.some((item) => !sessionAudioDone.has(item.key))
  );
  const skipDemoAudio = () => {
    gateQueue.forEach((item) => {
      if (!sessionAudioDone.has(item.key)) {
        markAudioEnded(item.key);
      }
    });
    if (introAudio && current?.intro) {
      setIntroStep(introQueue.length);
      if (index < pages.length - 1) {
        go(index + 1);
      }
    }
    setAutoPlayBlocked(false);
  };
  const introAudioNode = introAudio ? (
    <Box style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
      <LimitedAudio
        key={`${current?.key}-${introStep}-${listenNonce}`}
        src={media.asset(introAudio.mediaId!)}
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
      styles={{
        root: {
          color: "var(--mantine-color-white)",
          fontWeight: 600,
        },
      }}
    >
      Skip audio
    </Button>
  ) : null;
  const headerAudioNode = demoMode
    ? (demoPendingAudio
      ? demoSkipNode
      : headerAudio.length > 0 ? (
        <Stack gap={4}>
          {headerAudio.map((item) => (
            <LimitedAudio
              key={item.id}
              src={media.asset(item.mediaId!)}
              limit={0}
              compact
              label="Audio"
            />
          ))}
        </Stack>
      ) : null)
    : listening
      ? null
      : headerAudio.length > 0 ? (
        <Stack gap={4}>
          {headerAudio.map((item) => (
            <LimitedAudio
              key={item.id}
              src={media.asset(item.mediaId!)}
              limit={0}
              compact
              label="Audio"
            />
          ))}
        </Stack>
      ) : null;

  const chromeProgressLabel = current
    ? toeflChromeProgress(
      current.section,
      resolveChromeProgressPage(pages, index, current, numberScope),
      scopeSlotTotal(pages, current, numberScope),
    )
    : null;
  const headerProgressLabel = confirming ? "Submit" : chromeProgressLabel;
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
      <Group justify="flex-end" gap="md" wrap="nowrap" w="100%">
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
  const sectionInstructions = current ? toInstructionDoc(current.section.instructions) : null;
  const partInstructions = current?.part ? toInstructionDoc(current.part.instructions) : null;

  const scopeHeading = (key: string) => {
    if (!current?.intro) return null;
    const section = current.intro === "section";
    const title = section ? current.section.title : current.part?.title;
    const doc = section ? sectionInstructions : partInstructions;
    return (
      <Stack key={key} gap="xl">
        {title ? (
          <Text
            fw={700}
            ta="center"
            style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
          >
            {title}
          </Text>
        ) : null}
        {doc && instructionHasContent(doc) ? (
          <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
            <PromptView doc={doc} />
          </Box>
        ) : null}
      </Stack>
    );
  };

  const stepForward = (next: number) => {
    if (needsToeflForwardConfirm(index, next, pages, demoMode)) {
      setForwardConfirm(true);
      return;
    }
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

  const navSections = useMemo(() => buildNavSections(pages), [pages]);

  const goToSlot = (slot: number, within: RunnerPage[] = pages) => {
    const page = within.find((item) => item.count > 0 && slot >= item.start && slot <= item.end);
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

  const goNavPage = (page: RunnerPage | undefined) => {
    if (!page) {
      return;
    }
    const pageIndex = pages.indexOf(page);
    if (pageIndex < 0 || !canGoTo(pageIndex)) {
      return;
    }
    setFocusSlot(page.count > 0 ? page.start : null);
    goChecked(pageIndex);
  };

  const demoQuestionNav = demoMode ? (
    <Box
      component="nav"
      aria-label="Questions"
      className="runner-toefl-demo-nav"
      style={{
        width: "100%",
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        background: "var(--mantine-color-body)",
        boxShadow: "var(--shadow-soft)",
        borderRadius: "var(--mantine-radius-default)",
        padding: "var(--block-pad-y) var(--block-pad-x)",
      }}
    >
      <Stack gap="sm">
        <SettingsHint>
          Отображается только в демо-просмотре для перехода
        </SettingsHint>
        {navSections.map((section) => {
          const sectionPages = section.parts.flatMap((group) => group.pages);
          const sectionActive = Boolean(
            current
            && current.section.id === section.sectionId
            && (current as ToeflPage).intro === "section",
          );
          const openSection = () => {
            goNavPage(sectionEntryPage(sectionPages, section.sectionId));
          };
          return (
            <Stack key={section.key} gap={6}>
              <UnstyledButton
                className="runner-toefl-demo-nav-title"
                onClick={openSection}
                aria-current={sectionActive ? "true" : undefined}
              >
                <Text
                  size="md"
                  fw={700}
                  ta="left"
                  c={sectionActive ? "iba" : undefined}
                  style={{ lineHeight: "var(--mantine-line-height-md)" }}
                >
                  {section.title}
                </Text>
              </UnstyledButton>
              {section.parts.map((group) => {
                const active = Boolean(
                  current
                  && group.partId
                  && current.part?.id === group.partId
                  && (current as ToeflPage).intro === "part",
                );
                const showPartTitle = group.partId != null || section.parts.length > 1;
                const openGroup = () => {
                  goNavPage(partEntryPage(group));
                };
                return (
                  <Stack key={group.key} gap={2} pl={showPartTitle ? "md" : 0}>
                    {showPartTitle ? (
                      <UnstyledButton
                        className="runner-toefl-demo-nav-title"
                        onClick={openGroup}
                        aria-current={active ? "true" : undefined}
                      >
                        <Text
                          size="sm"
                          fw={active ? 700 : 600}
                          ta="left"
                          c={active ? "iba" : undefined}
                          style={{ lineHeight: "var(--mantine-line-height-sm)" }}
                        >
                          {group.label}
                        </Text>
                      </UnstyledButton>
                    ) : null}
                    <Group
                      gap={2}
                      component="ol"
                      wrap="wrap"
                      style={{ listStyle: "none", margin: 0, padding: 0 }}
                    >
                      {group.pages.flatMap((page) => {
                        const pageIndex = pages.indexOf(page);
                        const allowed = canGoTo(pageIndex);
                        return navUnits(page, answers, examType).map((unit) => {
                          const answered = unit.answered === unit.total;
                          const focused = page.key === current?.key
                            && focusSlot !== null
                            && focusSlot >= unit.start
                            && focusSlot <= unit.end;
                          const label = formatQuestionRange(unit.start, unit.total);
                          return (
                            <Box component="li" key={unit.key}>
                              <UnstyledButton
                                className="runner-toefl-demo-nav-unit"
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
                                  height: 32,
                                  paddingInline: 3,
                                  opacity: allowed ? 1 : 0.4,
                                  cursor: allowed ? "pointer" : "not-allowed",
                                }}
                              >
                                <Text
                                  span
                                  size="sm"
                                  fw={focused || answered ? 700 : 500}
                                  c={focused ? "iba" : answered ? "dark" : "dimmed"}
                                  style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}
                                >
                                  {label}
                                </Text>
                                <Box
                                  aria-hidden
                                  className="runner-toefl-demo-nav-unit-mark"
                                  style={{
                                    width: unit.total > 1 ? "100%" : 12,
                                    height: 2,
                                    borderRadius: 1,
                                    background: answered || focused
                                      ? "var(--color-primary)"
                                      : "color-mix(in srgb, var(--color-dark) 22%, transparent)",
                                  }}
                                />
                              </UnstyledButton>
                            </Box>
                          );
                        });
                      })}
                    </Group>
                  </Stack>
                );
              })}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  ) : null;

  const renderGroupInstruction = (doc: Doc, pageLead = false) => (
    <Box
      className={`iba-test-copy runner-group-instruction${pageLead ? " runner-group-instruction-page" : ""}`}
    >
      <PromptView doc={doc} />
    </Box>
  );

  type BlockPanelItemsMode = "auto" | "visual" | "audio";

  const renderBlockPanel = (
    block: NonNullable<typeof current>["block"],
    options: {
      includeInstructions?: boolean;
      itemsMode?: BlockPanelItemsMode;
      question?: PublicQuestion | null;
    } = {},
  ) => {
    if (!block) {
      return null;
    }
    const includeInstructions = options.includeInstructions !== false;
    const itemsMode = options.itemsMode ?? "auto";
    const audioGroupPlayback = Boolean(current?.groupContent && blockHasAudio(block));
    const listenedMediaOnly = Boolean(current?.listenedBlockMediaOnly && blockHasAudio(block));
    const groupListenVisual = splitGroupListen && itemsMode === "visual";
    let items = (() => {
      if (itemsMode === "visual" || groupListenVisual || listenedMediaOnly) {
        return blockItems(block).filter((item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item));
      }
      if (itemsMode === "audio") {
        return blockItems(block).filter((item) => item.kind === "audio" && item.mediaId);
      }
      if (audioGroupPlayback) {
        return blockItems(block).filter((item) => item.kind !== "text");
      }
      const legacyIntegrated = Boolean(
        options.question
        && questionReadingSeconds(options.question) > 0
        && blockHasAudio(block)
        && blockHasSideText(block)
        && !listening
        && !current?.groupContent,
      );
      if (legacyIntegrated && current && options.question) {
        const readingActive = !readingDone.has(options.question.id);
        const blockAudioPending = !groupBlockAudioReady(
          { ...current, block, questions: [options.question] },
          block.id,
          sessionAudioDone,
        );
        if (!readingActive && blockAudioPending) {
          return blockItems(block).filter((item) => item.kind !== "text");
        }
        return blockItems(block);
      }
      if (current?.listenedBlock && blockHasAudio(block) && !current.listenedBlockMediaOnly) {
        return blockItems(block).filter((item) => item.kind !== "text");
      }
      return blockItems(block);
    })();
    items = filterBlockItemsWithoutGroupVisual(items, block, options.question ?? null);
    const filled = items.some(contentItemFilled);
    const blockInstructions = toInstructionDoc(block.instructions);
    const hasInstructions = includeInstructions && instructionHasContent(blockInstructions);
    if (!hasInstructions && !filled) {
      return null;
    }
    return (
      <Stack key={`block-panel-${block.id}`} gap="sm">
        {hasInstructions ? (
          renderGroupInstruction(blockInstructions)
        ) : null}
        {filled ? (
          <Box
            className="iba-test-copy"
            style={shouldFrameContentItems(items, examType) ? passageFrameStyle : undefined}
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

  const groupPlaybackPanel = current?.groupContent && current.block ? (
    splitGroupListen ? (
      <Stack gap="md" w="100%">
        {renderBlockPanel(current.block, { includeInstructions: false, itemsMode: "audio" })}
      </Stack>
    ) : (
      <Stack gap="md" align="stretch">
        {current.block.title && examType !== "TOEFL" ? (
          <Text fw={700} ta="center" style={{ fontSize: "var(--type-h6-size)" }}>
            {current.block.title}
          </Text>
        ) : null}
        <Box maw={560} w="100%" mx="auto">
          {renderBlockPanel(current.block, { includeInstructions: true })}
        </Box>
      </Stack>
    )
  ) : null;

  const questionStack = current?.groupContent ? groupPlaybackPanel : current ? (
    <Stack gap="md">
      {(() => {
        let start = current.start;
        let lastBlockId: string | null = current.block?.id ?? null;
        const nodes: ReactNode[] = [];
        if (current.block && !splitWorkspace && (blockPassageFilled || current.listenedBlock)) {
          nodes.push(renderBlockPanel(current.block, {
            includeInstructions: !elevatedPageInstruction,
            question: primaryQuestion,
          }));
        }
        for (const question of current.questions) {
          const count = questionSlotCount(question, examType);
          const questionStart = start;
          start += count;
          const qLeft = questionLeft(question.id);
          const qLocked = qLeft !== null && qLeft <= 0;
          const timedQuestion = Boolean(question.settings.timeLimitSeconds);
          const audioPending = timedQuestion && examAudioOn && !questionAudioReady(gateQueue, sessionAudioDone, question)
            && questionEnds[question.id] == null;
          const audioBlocksInteraction = !pageInteractionReady(current, gateQueue, sessionAudioDone, readingDone, question);
          const listeningContentGate = Boolean(
            listening && !current.groupContent && audioBlocksInteraction,
          );
          const speakingQuestion = engineOf(question.type) === "SPEAKING";
          const blockId = question.materialBlockId ?? null;
          if (!splitWorkspace && !current.block && blockId && blockId !== lastBlockId) {
            lastBlockId = blockId;
            const block = current.section.materialBlocks?.find((item) => item.id === blockId) ?? null;
            if (block && blockHasSideText(block)) {
              nodes.push(renderBlockPanel(block, {
                includeInstructions: !elevatedPageInstruction,
                question,
              }));
            }
          }
          const playerNode = (
              <QuestionPlayer
                question={question}
                kicker={formatQuestionRange(questionStart, count, numberFormat)}
                answer={answers[question.id] ?? {}}
                onAnswer={(answer) => handleAnswer(question.id, answer)}
                readOnly={(!speakingQuestion && audioBlocksInteraction) || (!demoMode && (pageReadOnly || (qLocked && !speakingQuestion)))}
                startNumber={questionStart}
                numberFormat={numberFormat}
                examType={examType}
                examAudio={questionExamAudio(question.id)}
                hideQuestionsHeading
                hideBlankNumbers
                parenLetters
                headingBelowInstructions
                hideInstructions={elevatedPageInstruction}
                hideTaskAudio={Boolean(current.block && blockHasAudio(current.block))}
                hideWordCount={!wordCountVisible}
                showWordCountToggle={engineOf(question.type) === "WRITTEN"}
                onToggleWordCount={() => setWordCountVisible((visible) => !visible)}
                speakingPromptReady={speakingPromptCanStart(current, question, sessionAudioDone, readingDone, demoMode)}
                autoPlayTaskVideo={shouldAutoPlayQuestionTaskVideo(
                  current.groupContent,
                  question,
                  speakingAutoFlow,
                  videoAutoStart,
                )}
                speakingAutoFlow={speakingAutoFlow}
                onSpeakingComplete={() => {
                  if (index < pages.length - 1) {
                    advanceTo(index + 1);
                  }
                }}
                listeningContentGate={listeningContentGate}
              />
          );
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
              {questionReadingSeconds(question) > 0 && !readingDone.has(question.id) && !demoMode ? (
                <Countdown label="Reading" seconds={readingLeft[question.id] ?? questionReadingSeconds(question)} />
              ) : null}
              {audioPending && !listening ? (
                <SettingsHint>The timer starts after the audio</SettingsHint>
              ) : null}
              {qLeft !== null && qLeft > 0 && !listening ? (
                <Countdown label="Question" seconds={qLeft} />
              ) : null}
              {qLocked && !listening ? (
                <Alert color="yellow" variant="light" p="xs">Time for this question is up</Alert>
              ) : null}
              {playerNode}
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

  const audioListenBanner = autoPlayBlocked && ((examAudioOn && (audioAutoStart || listening || speaking) && gateActiveKey) || introAudio) ? (
    <Alert color="iba" variant="light" mb="md">
      <Group justify="space-between" gap="md" wrap="wrap">
        <Text size="sm">Press “Play” to start the audio. It cannot be paused</Text>
        <Group gap="md" wrap="nowrap">
          {demoMode && demoPendingAudio ? (
            <Button size="compact-sm" variant="default" onClick={skipDemoAudio}>
              Skip audio
            </Button>
          ) : null}
          <ListenFallbackButton
            onClick={() => {
              setAutoPlayBlocked(false);
              setListenNonce((value) => value + 1);
            }}
          />
        </Group>
      </Group>
    </Alert>
  ) : null;

  const partHeaderSeconds = currentPartLeft !== null
    ? currentPartLeft
    : (current?.part && partLimitSeconds(current.part) > 0 && current.part.id && partEnds[current.part.id] == null
      ? partLimitSeconds(current.part)
      : null);
  const partTimerInChrome = partHeaderSeconds !== null && partHeaderSeconds > 0;
  const sectionHeaderSeconds = partTimerInChrome
    ? null
    : currentSectionLeft !== null
      ? currentSectionLeft
      : (current?.section
        && limitSecondsFromSection(current.section) > 0
        && sectionEnds[current.section.id] == null
        ? limitSecondsFromSection(current.section)
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

  const listeningQuestion = listening && current?.questions[0] ? current.questions[0] : undefined;
  const answerSeconds = listeningQuestion ? questionLeft(listeningQuestion.id) : null;
  const groupQuestion = current?.listenedBlock ? current.questions[0] : undefined;
  const earlyNextInGroup = Boolean(
    listening
    && groupQuestion
    && isAnswered(groupQuestion, answers[groupQuestion.id]),
  );
  const listeningPageQuestion = listening && current?.questions[0] ? current.questions[0] : undefined;
  const earlyNextListening = Boolean(
    listeningPageQuestion
    && isAnswered(listeningPageQuestion, answers[listeningPageQuestion.id]),
  );
  const allowChromeNext = toeflAllowChromeNext({
    demoMode,
    speakingAutoFlow,
    listeningLocked,
    intro: current?.intro,
    introAudioCount: introQueue.length,
    groupContent: Boolean(current?.groupContent),
    examAudioOn,
    earlyNextInGroup,
    earlyNextListening,
  });
  const showBack = showRunnerBack(index, canGoTo);
  const onLastPage = index >= pages.length - 1;
  const showForward = onLastPage
    ? !demoMode
    : showRunnerForward(index, pages.length, canGoTo, allowChromeNext, demoMode);
  const earlyFinish = current && !demoMode && index < pages.length - 1 && allowEarlySubmit ? (
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
  const showChromeNav = showBack || showForward;
  const pageNav = current && (showChromeNav || earlyFinish) ? (
    <Stack gap="sm">
      {showChromeNav ? (
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
      ) : null}
      {earlyFinish}
    </Stack>
  ) : null;

  return (
    <Box
      data-runner-layout="toefl"
      style={{
        minHeight: "100vh",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-page)",
        overflow: "hidden",
      }}
    >
      <Box
        ref={top}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          paddingBlock: "var(--space-16)",
          paddingInline: "var(--space-16)",
        }}
      >
        {alerts}
        {audioListenBanner}
        {introAudioNode}
        <Box
          className="runner-toefl-workspace"
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          <Box
            className="runner-toefl-workspace-row"
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              width: "100%",
              maxWidth: demoMode ? "none" : "var(--runner-toefl-card-max)",
              marginInline: demoMode ? undefined : "auto",
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: "var(--mantine-spacing-md)",
            }}
          >
            {demoMode ? (
              <Box
                aria-hidden
                className="runner-toefl-demo-nav-balancer"
                style={{ flex: "1 1 0", minWidth: 0 }}
              />
            ) : null}
            <Box
              style={{
                flex: demoMode ? "0 1 var(--runner-toefl-card-max)" : "1 1 auto",
                minWidth: 0,
                width: demoMode ? "min(100%, var(--runner-toefl-card-max))" : "100%",
                maxWidth: "var(--runner-toefl-card-max)",
                display: "flex",
                flexDirection: "column",
              }}
            >
          <TakeHeader
            variant="stacked"
            tone="iba"
            center={headerAudioNode}
            leading={headerProgressLabel ? (
              <Text
                fw={600}
                style={{
                  fontSize: "var(--type-body, 1rem)",
                  lineHeight: "var(--mantine-line-height-md)",
                  whiteSpace: "nowrap",
                }}
              >
                {headerProgressLabel}
              </Text>
            ) : null}
          >
            <Group gap="md" wrap="nowrap">
              {timersVisible ? (
                <>
                  {focusLossMax > 0 && onFocusLossExhausted ? (
                    <Text
                      size="sm"
                      c={focusGuard.count > 0 ? "orange.3" : undefined}
                      style={{ whiteSpace: "nowrap", color: focusGuard.count > 0 ? undefined : "color-mix(in srgb, white 80%, transparent)" }}
                    >
                      Tab switches: {focusGuard.count} of {focusLossMax}
                    </Text>
                  ) : null}
                  {sectionHeaderSeconds !== null && sectionHeaderSeconds > 0 ? (
                    <Countdown label="Section" seconds={sectionHeaderSeconds} digitsOnly onDark />
                  ) : null}
                  {partHeaderSeconds !== null && partHeaderSeconds > 0 ? (
                    <Countdown label="Part" seconds={partHeaderSeconds} digitsOnly onDark />
                  ) : null}
                  {listening && answerSeconds !== null && answerSeconds > 0 ? (
                    <Countdown label="Answer" seconds={answerSeconds} digitsOnly calm onDark />
                  ) : null}
                  {testLeft !== null ? <Countdown label="Test" seconds={testLeft} digitsOnly onDark /> : null}
                </>
              ) : null}
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
          </TakeHeader>
          {current || confirming ? (
            <Card
              w="100%"
              shadow="sm"
              bg="white"
              className="runner-task-card"
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
            <Box
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflow: "hidden",
              }}
            >
              {confirming ? (
                <RunnerScrollPane
                  className="runner-page-body"
                  variant="embed"
                  style={{ flex: 1, minHeight: 0, height: "100%" }}
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
              ) : current ? (
              <>
              {scopeHeading("main")}
              {elevatedPageInstruction && pageInstructionDoc
                ? renderGroupInstruction(pageInstructionDoc, true)
                : null}
              {current?.groupContent && current.block && !elevatedPageInstruction
                && instructionHasContent(toInstructionDoc(current.block.instructions))
                ? renderGroupInstruction(toInstructionDoc(current.block.instructions), true)
                : null}
              {useSplitLayout && current.block ? (
                <Box
                  className={stackSplitLayout ? "runner-question-split runner-question-split--stacked" : "runner-question-split"}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: stackSplitLayout ? "flex" : "grid",
                    flexDirection: stackSplitLayout ? "column" : undefined,
                    gridTemplateColumns: stackSplitLayout ? undefined : "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: "var(--mantine-spacing-md)",
                    alignItems: "stretch",
                    overflow: "hidden",
                  }}
                >
                  <RunnerScrollPane
                    key={`block-${current.block.id}`}
                    className="runner-group-passage"
                    variant="embed"
                    style={stackSplitLayout
                      ? { flex: "none", height: "auto", maxHeight: "min(50vh, 520px)" }
                      : { minHeight: 0, height: "100%" }}
                  >
                    {renderBlockPanel(current.block, {
                      includeInstructions: false,
                      itemsMode: splitGroupListen || current.listenedBlockMediaOnly ? "visual" : "auto",
                      question: primaryQuestion,
                    })}
                  </RunnerScrollPane>
                  <RunnerScrollPane
                    className="runner-question-pane"
                    variant="embed"
                    style={stackSplitLayout
                      ? { flex: 1, minHeight: 0, height: "auto" }
                      : { minHeight: 0, height: "100%" }}
                  >
                    {questionStack}
                  </RunnerScrollPane>
                </Box>
              ) : centeredQuestionPane ? (
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <RunnerScrollPane
                    className="runner-question-pane runner-question-pane--centered"
                    variant="embed"
                    style={{
                      height: "100%",
                      minHeight: 0,
                      width: "100%",
                      maxWidth: "var(--runner-toefl-centered-pane-max)",
                    }}
                  >
                    {questionStack}
                  </RunnerScrollPane>
                </Box>
              ) : (
                <RunnerScrollPane
                  className="runner-page-body"
                  variant="embed"
                  style={{ flex: 1, minHeight: 0, height: "100%" }}
                >
                  {questionStack}
                </RunnerScrollPane>
              )}
              {pageNav}
              </>
              ) : null}
            </Box>
          </Card>
          ) : null}
            </Box>
            {demoMode ? (
              <Box
                className="runner-toefl-demo-nav-column"
                style={{
                  flex: "1 1 0",
                  minWidth: "var(--runner-toefl-demo-nav-min, 12rem)",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: "stretch",
                }}
              >
                {demoQuestionNav}
              </Box>
            ) : null}
          </Box>
        </Box>
      </Box>
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
      {forwardConfirm && (
        <ConfirmDialog
          open
          title="Continue?"
          confirmLabel="Continue"
          cancelLabel="Stay"
          onConfirm={() => {
            setForwardConfirm(false);
            go(index + 1);
          }}
          onClose={() => setForwardConfirm(false)}
        >
          You will not be able to return to this module after you continue.
        </ConfirmDialog>
      )}
      <style>{`
        .runner-group-instruction {
          text-align: center;
          font-size: var(--type-h6-size);
          line-height: var(--type-h6-line);
          font-weight: 700;
        }
        .runner-group-instruction p,
        .runner-group-instruction h2,
        .runner-group-instruction h3 {
          font-weight: 700;
          font-size: inherit;
          line-height: inherit;
          text-align: center;
        }
        .runner-toefl-chrome .runner-toefl-timer-toggle:hover {
          background: color-mix(in srgb, var(--mantine-color-white) 14%, transparent) !important;
          color: var(--mantine-color-white) !important;
        }
        .runner-toefl-chrome .runner-toefl-timer-toggle:active {
          background: color-mix(in srgb, var(--mantine-color-white) 22%, transparent) !important;
        }
        .runner-toefl-chrome .runner-toefl-skip-audio {
          border: 1px solid color-mix(in srgb, var(--mantine-color-white) 45%, transparent);
        }
        .runner-toefl-chrome .runner-toefl-skip-audio:hover {
          border-color: color-mix(in srgb, var(--mantine-color-white) 70%, transparent) !important;
        }
        .runner-toefl-demo-nav-title {
          display: block;
          width: 100%;
          text-align: left;
          border-radius: var(--mantine-radius-sm);
        }
        .runner-toefl-demo-nav-title:hover .mantine-Text-root {
          color: var(--color-primary);
        }
        .runner-toefl-demo-nav-unit:hover:not(:disabled) .runner-toefl-demo-nav-unit-mark {
          background: var(--color-primary);
        }
        [data-runner-layout="toefl"] .runner-question-split--stacked .runner-group-passage {
          height: auto !important;
        }
        [data-runner-layout="toefl"] .runner-question-split--stacked .runner-group-passage .runner-scroll-body {
          min-height: 0;
        }
        @media (max-width: 767px) {
          [data-runner-layout="toefl"] .runner-question-split {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            overflow: auto !important;
          }
          [data-runner-layout="toefl"] .runner-question-split .runner-group-passage {
            height: auto !important;
            max-height: min(45vh, 420px) !important;
          }
          [data-runner-layout="toefl"] .runner-question-split .runner-question-pane {
            height: auto !important;
            max-height: none !important;
          }
          .runner-toefl-workspace-row {
            flex-direction: column !important;
            max-width: var(--runner-toefl-card-max) !important;
          }
          .runner-toefl-demo-nav-balancer {
            display: none !important;
          }
          .runner-toefl-demo-nav-column {
            flex: none !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .runner-toefl-demo-nav {
            max-height: min(40vh, 320px);
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

type NavSection = {
  key: string;
  sectionId: string;
  title: string;
  parts: NavGroup[];
};

function buildNavSections(pages: RunnerPage[]): NavSection[] {
  const groups = buildNavGroups(pages);
  const sections: NavSection[] = [];
  for (const group of groups) {
    const last = sections[sections.length - 1];
    if (last?.sectionId === group.sectionId) {
      last.parts.push(group);
      continue;
    }
    const sectionTitle = group.pages[0]?.section.title?.trim() || group.label;
    sections.push({
      key: `section:${group.sectionId}`,
      sectionId: group.sectionId,
      title: sectionTitle,
      parts: [group],
    });
  }
  return sections;
}

function sectionEntryPage(sectionPages: RunnerPage[], sectionId: string): RunnerPage | undefined {
  const intro = sectionPages.find(
    (page) => page.section.id === sectionId && (page as ToeflPage).intro === "section",
  );
  if (intro) {
    return intro;
  }
  return sectionPages.find((page) => !(page as ToeflPage).intro) ?? sectionPages[0];
}

function partEntryPage(group: NavGroup): RunnerPage | undefined {
  const intro = group.pages.find((page) => (page as ToeflPage).intro === "part");
  if (intro) {
    return intro;
  }
  return group.pages.find((page) => !(page as ToeflPage).intro) ?? group.pages[0];
}

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

