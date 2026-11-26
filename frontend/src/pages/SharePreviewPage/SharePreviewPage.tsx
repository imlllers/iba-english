import { Box, Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AnswerData } from "@/entities/question/types";
import { withNormalizedSettings } from "@/entities/test/settings";
import { partLimitSeconds } from "@/features/test-taking/partTiming";
import { limitSecondsFromSection } from "@/shared/lib/durationMmSs";
import { TestRunner } from "@/features/test-taking/TestRunner";
import { mockPreviewScale, ParticipantResultBody } from "@/features/results/ParticipantResultBody";
import { errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { MessagePage } from "@/shared/ui/MessagePage";
import { ToeflTakeShell } from "@/features/test-taking/layouts/toefl/ToeflTakeShell";
import { stackedLayoutOf, usesStackedTakeChrome } from "@/features/test-taking/layouts/runnerLayout";
import { TakeCenteredPage } from "@/features/test-taking/TakeCenteredPage";
import { MediaProvider } from "@/features/question-types/media/MediaContext";
import { shareApi, shareMediaUrl } from "@/features/tests/shareApi";

function endsAfterSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function SharePreviewPage() {
  const { shareId = "" } = useParams();
  const preview = useQuery({
    queryKey: ["share-preview", shareId],
    queryFn: () => shareApi.preview(shareId),
    refetchOnMount: "always",
  });
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sectionEnds, setSectionEnds] = useState<Record<string, string | null>>({});
  const [partEnds, setPartEnds] = useState<Record<string, string | null>>({});
  const [questionEnds, setQuestionEnds] = useState<Record<string, string | null>>({});
  const enteredSections = useRef(new Set<string>());
  const enteredParts = useRef(new Set<string>());
  const enteredQuestions = useRef(new Set<string>());

  const onEnterSection = useCallback((sectionId: string) => {
    const test = preview.data;
    if (!test || enteredSections.current.has(sectionId)) {
      return;
    }
    const section = test.sections.find((item) => item.id === sectionId);
    const limitSeconds = limitSecondsFromSection(section ?? {});
    if (limitSeconds <= 0) {
      return;
    }
    enteredSections.current.add(sectionId);
    setSectionEnds((current) => ({ ...current, [sectionId]: endsAfterSeconds(limitSeconds) }));
  }, [preview.data]);

  const onEnterPart = useCallback((partId: string) => {
    const test = preview.data;
    if (!test || enteredParts.current.has(partId)) {
      return;
    }
    const part = test.sections.flatMap((section) => section.parts ?? []).find((item) => item.id === partId);
    const limitSeconds = partLimitSeconds(part);
    if (limitSeconds <= 0) {
      return;
    }
    enteredParts.current.add(partId);
    setPartEnds((current) => ({ ...current, [partId]: endsAfterSeconds(limitSeconds) }));
  }, [preview.data]);

  const onEnterQuestions = useCallback((questionIds: string[]) => {
    const test = preview.data;
    if (!test) {
      return;
    }
    for (const questionId of questionIds) {
      if (enteredQuestions.current.has(questionId)) {
        continue;
      }
      const section = test.sections.find((item) => item.questions.some((q) => q.id === questionId));
      const question = section?.questions.find((item) => item.id === questionId);
      const seconds = question?.settings?.timeLimitSeconds;
      if (!seconds) {
        continue;
      }
      enteredQuestions.current.add(questionId);
      setQuestionEnds((current) => ({
        ...current,
        [questionId]: new Date(Date.now() + seconds * 1000).toISOString(),
      }));
    }
  }, [preview.data]);

  if (preview.isLoading) {
    return <Loading fullPage text="Загрузка предпросмотра…" />;
  }
  if (preview.isError || !preview.data) {
    return (
      <MessagePage title="Предпросмотр недоступен" action={<Button component={Link} to="/teacher/tests" variant="default">К тестам</Button>}>
        {errorMessage(preview.error, "Предложение не найдено")}
      </MessagePage>
    );
  }
  const test = withNormalizedSettings(preview.data);
  const mediaResolver = {
    asset: (id: string) => shareMediaUrl(shareId, id),
    recording: (id: string) => shareMediaUrl(shareId, id),
  };
  if (submitted && test.settings.showResultToParticipant) {
    const examType = test.settings.examType ?? "CUSTOM";
    const body = (
      <Box w="100%" maw={usesStackedTakeChrome(examType) ? "var(--runner-toefl-centered-pane-max)" : 480}>
        <ParticipantResultBody
          examType={examType}
          resultDetail={test.settings.resultDetail}
          scoreVisible
          score={0}
          maxScore={0}
          scale={mockPreviewScale(test.settings)}
          previewNote="Демо-предпросмотр: пример итога, ответы не оцениваются"
        />
      </Box>
    );
    if (usesStackedTakeChrome(examType)) {
      return (
        <ToeflTakeShell layout={stackedLayoutOf(examType)} centerContent>
          {body}
        </ToeflTakeShell>
      );
    }
    return <TakeCenteredPage>{body}</TakeCenteredPage>;
  }
  return (
    <MediaProvider value={mediaResolver}>
      <TestRunner
        test={test}
        answers={answers}
        onAnswer={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))}
        expiresAt={null}
        sectionEnds={sectionEnds}
        partEnds={partEnds}
        questionEnds={questionEnds}
        onEnterSection={onEnterSection}
        onEnterPart={onEnterPart}
        onEnterQuestions={onEnterQuestions}
        onExpire={() => undefined}
        submitting={false}
        submitError={submitted ? "В предпросмотре ответы не отправляются и не оцениваются." : undefined}
        onSubmit={() => setSubmitted(true)}
        pageStorageKey={`iba-share-preview-page:${shareId}`}
        demoMode
      />
    </MediaProvider>
  );
}