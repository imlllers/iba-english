import { Alert, Anchor } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PublicTest } from "@/entities/test/types";
import { MediaProvider, type MediaResolver } from "@/features/question-types/media/MediaContext";
import { TestIntro } from "@/features/test-taking/TestIntro";
import { TestRunner } from "@/features/test-taking/TestRunner";
import { partLimitSeconds } from "@/features/test-taking/partTiming";
import { limitSecondsFromSection } from "@/shared/lib/durationMmSs";
import { attemptMediaUrl, publicApi } from "@/features/test-taking/publicApi";
import { waitForSpeakingUploads } from "@/features/question-types/engines/speaking/speakingUploadQueue";
import { useAnswerSaver } from "@/features/test-taking/useAnswerSaver";
import { ApiError } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { MessagePage } from "@/shared/ui/MessagePage";

const attemptKey = (publicToken: string) => `iba-attempt:${publicToken}`;
const resultKey = (publicToken: string) => `iba-result:${publicToken}`;

type Running = { token: string; test: PublicTest; expiresAt: string | null; blockEndsAt: string | null };

export function TakeTestPage() {
  const { publicToken = "" } = useParams();
  const navigate = useNavigate();
  const [running, setRunning] = useState<Running | null>(null);
  const [resuming, setResuming] = useState(() => Boolean(localStorage.getItem(attemptKey(publicToken))));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [sectionEnds, setSectionEnds] = useState<Record<string, string | null>>({});
  const [partEnds, setPartEnds] = useState<Record<string, string | null>>({});
  const [questionEnds, setQuestionEnds] = useState<Record<string, string | null>>({});
  const [audioDone, setAudioDone] = useState<string[]>([]);
  const [readingStarted, setReadingStarted] = useState<Record<string, string>>({});
  const [readingDone, setReadingDone] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const entered = useRef(new Set<string>());
  const enteredParts = useRef(new Set<string>());
  const enteredQuestions = useRef(new Set<string>());
  const partPauseKey = useRef(new Map<string, string>());
  const submitted = useRef(false);
  const token = running?.token ?? null;
  const previous = localStorage.getItem(resultKey(publicToken));

  const intro = useQuery({
    queryKey: ["public-test", publicToken],
    queryFn: () => publicApi.test(publicToken),
    enabled: !running && !resuming,
    retry: false,
  });

  const submit = useCallback(async (attemptToken: string) => {
    if (submitted.current) {
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      await publicApi.submit(attemptToken);
      localStorage.removeItem(attemptKey(publicToken));
      sessionStorage.removeItem(`iba-focus-loss:${attemptToken}`);
      localStorage.setItem(resultKey(publicToken), attemptToken);
      navigate(`/attempt/${attemptToken}/result`, { replace: true });
    } catch (failure) {
      submitted.current = false;
      setSubmitError("Could not submit your answers. Check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }, [navigate, publicToken]);

  const onFinal = useCallback((code: string) => {
    if (token && (code === "TIME_EXPIRED" || code === "ALREADY_SUBMITTED")) {
      void submit(token);
    }
  }, [token, submit]);

  const saver = useAnswerSaver(token, onFinal);
  const persistAnswers = useCallback(async () => {
    await waitForSpeakingUploads();
    return saver.flush();
  }, [saver]);

  useEffect(() => {
    const stored = localStorage.getItem(attemptKey(publicToken));
    if (!stored) {
      return;
    }
    publicApi.resume(stored).then(
      (attempt) => {
        saver.setAnswers(Object.fromEntries(attempt.answers.map((item) => [item.questionId, item.answerData ?? {}])));
        setRunning({
          token: stored,
          test: attempt.test,
          expiresAt: attempt.expiresAt,
          blockEndsAt: attempt.blockEndsAt ?? null,
        });
        setAudioDone(attempt.audioDone ?? []);
        setReadingStarted(attempt.reading?.started ?? {});
        setReadingDone(attempt.reading?.done ?? []);
        setResuming(false);
      },
      (failure: unknown) => {
        localStorage.removeItem(attemptKey(publicToken));
        if (failure instanceof ApiError && failure.code === "ALREADY_SUBMITTED") {
          localStorage.setItem(resultKey(publicToken), stored);
        }
        setResuming(false);
      },
    );
  }, [publicToken]);

  const media = useMemo<MediaResolver | null>(() => token ? {
    asset: (id) => attemptMediaUrl(token, id),
    recording: (id) => attemptMediaUrl(token, id),
    upload: async (blob, name) => (await publicApi.uploadRecording(token, blob, name)).id,
    playbackScope: token,
  } : null, [token]);

  const enterSection = useCallback((sectionId: string) => {
    if (!running || entered.current.has(sectionId)) {
      return;
    }
    const section = running.test.sections.find((item) => item.id === sectionId);
    const blockTypes = running.test.settings.timeLimitSectionTypes ?? [];
    const needsBlock = blockTypes.length > 0
      && Boolean(running.test.settings.timeLimitMinutes)
      && section != null
      && blockTypes.includes(section.sectionType);
    const sectionLimit = section ? limitSecondsFromSection(section) : 0;
    if (sectionLimit <= 0 && !needsBlock) {
      return;
    }
    entered.current.add(sectionId);
    publicApi.startSection(running.token, sectionId).then(
      (result) => {
        if (sectionLimit > 0) {
          setSectionEnds((current) => ({ ...current, [sectionId]: result.endsAt }));
        }
        if (result.blockEndsAt) {
          setRunning((current) => (current ? { ...current, blockEndsAt: result.blockEndsAt ?? null } : current));
        }
      },
      () => entered.current.delete(sectionId),
    );
  }, [running]);

  const enterPart = useCallback((partId: string) => {
    if (!running || enteredParts.current.has(partId)) {
      return;
    }
    const part = running.test.sections.flatMap((section) => section.parts ?? []).find((item) => item.id === partId);
    if (partLimitSeconds(part) <= 0) {
      return;
    }
    enteredParts.current.add(partId);
    publicApi.startPart(running.token, partId).then(
      (result) => setPartEnds((current) => ({ ...current, [partId]: result.endsAt })),
      () => enteredParts.current.delete(partId),
    );
  }, [running]);

  const pausePart = useCallback((partId: string, meta?: { audioKey: string; durationSeconds?: number }) => {
    if (!running || !meta?.audioKey) {
      return;
    }
    if (partPauseKey.current.get(partId) === meta.audioKey) {
      return;
    }
    partPauseKey.current.set(partId, meta.audioKey);
    publicApi.pausePart(running.token, partId, meta).then(
      (result) => setPartEnds((current) => ({ ...current, [partId]: result.endsAt })),
      () => undefined,
    );
  }, [running]);

  const resumePart = useCallback((partId: string) => {
    if (!running || !partPauseKey.current.has(partId)) {
      return;
    }
    partPauseKey.current.delete(partId);
    publicApi.resumePart(running.token, partId).then(
      (result) => setPartEnds((current) => ({ ...current, [partId]: result.endsAt })),
    );
  }, [running]);

  const enterQuestions = useCallback((questionIds: string[]) => {
    if (!running) {
      return;
    }
    for (const questionId of questionIds) {
      if (enteredQuestions.current.has(questionId)) {
        continue;
      }
      const question = running.test.sections.flatMap((section) => section.questions).find((item) => item.id === questionId);
      if (!question?.settings?.timeLimitSeconds) {
        continue;
      }
      enteredQuestions.current.add(questionId);
      publicApi.startQuestion(running.token, questionId).then(
        (result) => setQuestionEnds((current) => ({ ...current, [questionId]: result.endsAt })),
        () => enteredQuestions.current.delete(questionId),
      );
    }
  }, [running]);

  const start = async (name: string, email: string) => {
    setStarting(true);
    setStartError("");
    try {
      const attempt = await publicApi.start(publicToken, name, email);
      localStorage.setItem(attemptKey(publicToken), attempt.attemptToken);
      saver.setAnswers({});
      setRunning({
        token: attempt.attemptToken,
        test: attempt.test,
        expiresAt: attempt.expiresAt,
        blockEndsAt: attempt.blockEndsAt ?? null,
      });
      setAudioDone(attempt.audioDone ?? []);
      setReadingStarted(attempt.reading?.started ?? {});
      setReadingDone(attempt.reading?.done ?? []);
    } catch (failure) {
      setStartError(failure instanceof ApiError && failure.status < 500 ? "This test cannot be started. Check the details and try again" : "Could not start the test. Check your connection and try again");
    } finally {
      setStarting(false);
    }
  };

  if (running && media) {
    return (
      <MediaProvider value={media}>
        <TestRunner
          test={running.test}
          answers={saver.answers}
          onAnswer={saver.setAnswer}
          saveError={saver.error}
          expiresAt={running.expiresAt}
          blockEndsAt={running.blockEndsAt}
          sectionEnds={sectionEnds}
          partEnds={partEnds}
          questionEnds={questionEnds}
          onEnterSection={enterSection}
          onEnterPart={enterPart}
          onPausePart={pausePart}
          onResumePart={resumePart}
          onEnterQuestions={enterQuestions}
          submitting={submitting}
          submitError={submitError}
          attemptToken={running.token}
          focusLossStorageKey={`iba-focus-loss:${running.token}`}
          pageStorageKey={`iba-page:${running.token}`}
          initialAudioDone={audioDone}
          onPersistAudioDone={(key) => {
            if (running.token) {
              void publicApi.markAudioDone(running.token, key);
            }
          }}
          initialReadingStarted={readingStarted}
          initialReadingDone={readingDone}
          onPersistReadingStart={(questionId) => {
            if (readingStarted[questionId]) {
              return;
            }
            const stamp = new Date().toISOString();
            setReadingStarted((prev) => ({ ...prev, [questionId]: stamp }));
            void publicApi.markReadingStart(running.token, questionId);
          }}
          onPersistReadingDone={(questionId) => {
            setReadingDone((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
            void publicApi.markReadingDone(running.token, questionId);
          }}
          onExpire={() => void persistAnswers().finally(() => void submit(running.token))}
          onFocusLossExhausted={() => void persistAnswers().finally(() => void submit(running.token))}
          flushAnswers={persistAnswers}
          onSubmit={() => void persistAnswers().then((saved) => saved
            ? submit(running.token)
            : setSubmitError("Not all answers were saved. Check your internet connection and press “Submit” again"))}
        />
      </MediaProvider>
    );
  }

  if (resuming || intro.isLoading) {
    return <Loading fullPage text="Loading the test…" />;
  }

  if (intro.isError || !intro.data) {
    const code = intro.error instanceof ApiError ? intro.error.code : "";
    const title = code === "NOT_OPEN" ? "The test is not open yet" : code === "CLOSED" ? "The test is closed" : "The test is unavailable";
    return (
      <MessagePage title={title}>
        {code === "NOT_OPEN" || code === "CLOSED"
          ? "Ask your teacher when the test is available"
          : "The link has expired or the test is no longer published. Ask your teacher for a new link"}
      </MessagePage>
    );
  }

  return (
    <TestIntro
      test={intro.data}
      starting={starting}
      error={startError}
      onStart={(name, email) => void start(name, email)}
      notice={previous ? (
        <Alert variant="light">
          You have already submitted this test in this browser.{" "}
          <Anchor component={Link} to={`/attempt/${previous}/result`}>View result</Anchor>
        </Alert>
      ) : undefined}
    />
  );
}
