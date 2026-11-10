import { Box, Card, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { AnswerData, ContentItem, Doc, Question } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { publicView } from "@/features/question-types/content";
import { contentItemFilled } from "@/features/question-types/content/contentItems";
import { ContentFeedView } from "@/features/question-types/content/ContentFeedView";
import { instructionHasContent } from "@/features/question-types/content/instructionDoc";
import { passageFrameStyle, shouldFrameContentItems } from "@/features/question-types/content/passageFrame";
import { formatQuestionRange, ownQuestionsHeading, questionSlotCount } from "@/features/question-types/numbering";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { QuestionPlayer } from "@/features/question-types/QuestionPlayer";

type PreviewQuestion = {
  question: Question;
  startNumber: number;
};

type MaterialLivePreviewProps = {
  ariaLabel: string;
  title?: string;
  instructions: Doc;
  items: ContentItem[];
  questions?: PreviewQuestion[];
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
};

export function MaterialLivePreview({
  ariaLabel,
  title,
  instructions,
  items,
  questions = [],
  numberFormat = "1",
  examType = "CUSTOM",
}: MaterialLivePreviewProps) {
  const hasInstructions = instructionHasContent(instructions);
  const hasMedia = items.some(contentItemFilled);
  const hasTitle = Boolean(title?.trim());
  const hasQuestions = questions.length > 0;
  const empty = !hasTitle && !hasInstructions && !hasMedia && !hasQuestions;
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({});
  const questionIds = questions.map((item) => item.question.id).join("|");

  useEffect(() => {
    setAnswers({});
  }, [questionIds]);

  return (
    <Card
      component="aside"
      shadow="sm"
      bg="white"
      aria-label={ariaLabel}
      data-card-action
    >
      <Stack
        gap="md"
        className="iba-test-copy"
        style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}
      >
        <Stack gap="sm">
          {hasTitle ? (
            <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
              {title!.trim()}
            </Text>
          ) : null}
          {hasInstructions ? (
            <Box>
              <PromptView doc={instructions} />
            </Box>
          ) : null}
          {hasMedia ? (
            <Box style={shouldFrameContentItems(items) ? passageFrameStyle : undefined}>
              <ContentFeedView items={items} />
            </Box>
          ) : null}
        </Stack>
        {questions.map(({ question, startNumber }) => {
          const count = questionSlotCount(question, examType);
          const groupTitle = title?.trim() ?? "";
          const ownHeading = ownQuestionsHeading(question, startNumber, examType);
          return (
            <QuestionPlayer
              key={question.id}
              question={publicView(question)}
              kicker={formatQuestionRange(startNumber, count, numberFormat)}
              answer={answers[question.id] ?? {}}
              onAnswer={(answer) => setAnswers((prev) => ({ ...prev, [question.id]: answer }))}
              startNumber={startNumber}
              numberFormat={numberFormat}
              examType={examType}
              hideQuestionsHeading={Boolean(groupTitle && ownHeading === groupTitle)}
            />
          );
        })}
        {empty ? (
          <Text size="sm" c="dimmed" fw={500}>
            Пока нечего показать участнику
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
