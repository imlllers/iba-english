import { Card, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import type { AnswerData, Question } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat, SectionType } from "@/entities/test/types";
import { ToeflElevatedInstruction } from "@/features/test-taking/layouts/toefl/ToeflElevatedInstruction";
import { toeflPageInstructionDoc } from "@/features/test-taking/layouts/toefl/toeflPageInstruction";
import { isSpeakingAutoFlow } from "@/features/test-taking/speakingAutoFlow";
import { ToeicPreviewShell } from "@/features/test-builder/MaterialLivePreview";
import { publicView } from "./content";
import { formatQuestionRange, questionSlotCount, toeflQuestionBlockHeading } from "./numbering";
import { QuestionPlayer } from "./QuestionPlayer";

type QuestionLivePreviewProps = {
  question: Question;
  startNumber?: number;
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
  sectionType?: SectionType | null;
  speakingAutoFlow?: boolean | null;
};

export function QuestionLivePreview({
  question,
  startNumber = 1,
  numberFormat = "1",
  examType = "CUSTOM",
  sectionType = null,
  speakingAutoFlow = null,
}: QuestionLivePreviewProps) {
  const [answer, setAnswer] = useState<AnswerData>({});
  const slotCount = questionSlotCount(question, examType);
  const readingTotal = typeof question.settings.readingSeconds === "number" && question.settings.readingSeconds > 0
    ? question.settings.readingSeconds
    : 0;
  const speakingAuto = examType === "TOEIC" && isSpeakingAutoFlow(
    examType,
    sectionType ? { sectionType, speakingAutoFlow } : undefined,
  );
  const speakingPreviewStatic = speakingAuto;

  useEffect(() => {
    setAnswer({});
  }, [question.id, question.type]);

  const toefl = examType === "TOEFL";
  const toeic = examType === "TOEIC";
  const listening = toeic && sectionType === "LISTENING";
  const taskHeading = toeic && (sectionType === "SPEAKING" || sectionType === "WRITING");
  const elevatedDoc = toefl
    ? toeflPageInstructionDoc({ question, blockItems: [], questionPage: true })
  : null;
  const elevated = elevatedDoc != null;
  const player = (
    <QuestionPlayer
      question={publicView(question)}
      kicker={formatQuestionRange(startNumber, slotCount, numberFormat)}
      answer={answer}
      onAnswer={setAnswer}
      startNumber={startNumber}
      numberFormat={numberFormat}
      examType={examType}
      hideTaskAudio={toefl || listening}
      hideInstructions={elevated}
      hideQuestionsHeading={toefl || toeic}
      hideBlankNumbers={toefl || toeic}
      parenLetters={toefl || toeic}
      headingBelowInstructions={toefl || speakingAuto}
      questionBlockHeading={taskHeading ? toeflQuestionBlockHeading(startNumber, slotCount) : undefined}
      speakingAutoFlow={speakingAuto}
      speakingPreviewStatic={speakingPreviewStatic}
      speakingPromptReady={!speakingPreviewStatic || readingTotal <= 0}
      speakingReadingRemaining={
        speakingPreviewStatic && readingTotal > 0 ? readingTotal : undefined
      }
    />
  );

  if (toeic) {
    return (
      <ToeicPreviewShell ariaLabel="Превью задания для участника">
        <Stack gap="md" className="iba-test-copy" style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}>
          {player}
        </Stack>
      </ToeicPreviewShell>
    );
  }

  return (
    <Card
      component="aside"
      shadow="sm"
      bg="white"
      aria-label="Превью задания для участника"
      data-card-action
    >
      <Stack gap="md" className="iba-test-copy" style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}>
        {elevatedDoc ? <ToeflElevatedInstruction doc={elevatedDoc} /> : null}
        {player}
      </Stack>
    </Card>
  );
}
