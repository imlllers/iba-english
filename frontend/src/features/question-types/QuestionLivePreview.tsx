import { Card, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import type { AnswerData, Question } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { ToeflElevatedInstruction } from "@/features/test-taking/layouts/toefl/ToeflElevatedInstruction";
import { toeflPageInstructionDoc } from "@/features/test-taking/layouts/toefl/toeflPageInstruction";
import { publicView } from "./content";
import { formatQuestionRange, questionSlotCount } from "./numbering";
import { QuestionPlayer } from "./QuestionPlayer";

type QuestionLivePreviewProps = {
  question: Question;
  startNumber?: number;
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
};

export function QuestionLivePreview({
  question,
  startNumber = 1,
  numberFormat = "1",
  examType = "CUSTOM",
}: QuestionLivePreviewProps) {
  const [answer, setAnswer] = useState<AnswerData>({});
  const slotCount = questionSlotCount(question, examType);

  useEffect(() => {
    setAnswer({});
  }, [question.id, question.type]);

  const toefl = examType === "TOEFL";
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
      hideTaskAudio={toefl}
      hideInstructions={elevated}
      hideQuestionsHeading={toefl}
      hideBlankNumbers={toefl}
      parenLetters={toefl}
      headingBelowInstructions={toefl}
    />
  );

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
