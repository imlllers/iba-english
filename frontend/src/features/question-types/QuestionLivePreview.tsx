import { Card } from "@mantine/core";
import { useEffect, useState } from "react";
import type { AnswerData, Question } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
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

  return (
    <Card
      component="aside"
      shadow="sm"
      bg="white"
      aria-label="Превью задания для участника"
      data-card-action
    >
      <QuestionPlayer
        question={publicView(question)}
        kicker={formatQuestionRange(startNumber, slotCount, numberFormat)}
        answer={answer}
        onAnswer={setAnswer}
        startNumber={startNumber}
        numberFormat={numberFormat}
        examType={examType}
      />
    </Card>
  );
}
