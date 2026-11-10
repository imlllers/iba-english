import { Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AnswerData } from "@/entities/question/types";
import { TestRunner } from "@/features/test-taking/TestRunner";
import { testsApi } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { MessagePage } from "@/shared/ui/MessagePage";

function endsAfterMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function PreviewPage() {
  const { testId = "" } = useParams();
  const preview = useQuery({ queryKey: ["preview", testId], queryFn: () => testsApi.preview(testId), refetchOnMount: "always" });
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
    if (!section?.timeLimitMinutes) {
      return;
    }
    enteredSections.current.add(sectionId);
    setSectionEnds((current) => ({ ...current, [sectionId]: endsAfterMinutes(section.timeLimitMinutes!) }));
  }, [preview.data]);

  const onEnterPart = useCallback((partId: string) => {
    const test = preview.data;
    if (!test || enteredParts.current.has(partId)) {
      return;
    }
    const part = test.sections.flatMap((section) => section.parts ?? []).find((item) => item.id === partId);
    if (!part?.timeLimitMinutes) {
      return;
    }
    enteredParts.current.add(partId);
    setPartEnds((current) => ({ ...current, [partId]: endsAfterMinutes(part.timeLimitMinutes!) }));
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
      const question = test.sections.flatMap((section) => section.questions).find((item) => item.id === questionId);
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
      <MessagePage
        title="Предпросмотр недоступен"
        action={<Button component={Link} to={`/teacher/tests/${testId}`} variant="default">В конструктор</Button>}
      >
        {errorMessage(preview.error, "Тест не найден")}
      </MessagePage>
    );
  }
  return (
    <TestRunner
      test={preview.data}
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
      pageStorageKey={`iba-preview-page:${testId}`}
      demoMode
    />
  );
}
