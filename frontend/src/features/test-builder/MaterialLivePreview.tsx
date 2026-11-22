import { Box, Card, Stack, Text } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
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
import { ToeflElevatedInstruction } from "@/features/test-taking/layouts/toefl/ToeflElevatedInstruction";
import { previewBlockHasSideText, toeflPageInstructionDoc } from "@/features/test-taking/layouts/toefl/toeflPageInstruction";

type PreviewQuestion = {
  question: Question;
  startNumber: number;
};

export type MaterialPreviewScope = "section" | "part" | "block";

type MaterialLivePreviewProps = {
  ariaLabel: string;
  title?: string;
  instructions: Doc;
  items: ContentItem[];
  questions?: PreviewQuestion[];
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
  previewScope?: MaterialPreviewScope;
};

export function MaterialLivePreview({
  ariaLabel,
  title,
  instructions,
  items,
  questions = [],
  numberFormat = "1",
  examType = "CUSTOM",
  previewScope = "block",
}: MaterialLivePreviewProps) {
  const hasInstructions = instructionHasContent(instructions);
  const hasMedia = items.some(contentItemFilled);
  const hasTitle = Boolean(title?.trim());
  const hasQuestions = questions.length > 0;
  const empty = !hasTitle && !hasInstructions && !hasMedia && !hasQuestions;
  const toefl = examType === "TOEFL";
  const blockPreview = previewScope === "block";
  const blockAudio = items.some((item) => item.kind === "audio" && item.mediaId);
  const audioGroupListenOnly = toefl && blockPreview && blockAudio && questions.length > 1;
  const listenItems = items.filter((item) => item.kind !== "text");
  const sideText = toefl && blockPreview && !audioGroupListenOnly && previewBlockHasSideText(items);
  const inBlockContext = toefl && blockPreview && !audioGroupListenOnly;
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({});
  const questionIds = questions.map((item) => item.question.id).join("|");

  useEffect(() => {
    setAnswers({});
  }, [questionIds]);

  const groupTitle = title?.trim() ?? "";
  const topBlockInstructionDoc =
    inBlockContext && hasInstructions
      ? toeflPageInstructionDoc({
          blockInstructions: instructions,
          blockItems: items,
          inBlockContext: true,
        })
      : null;

  const questionNodes = questions.map(({ question, startNumber }) => {
    const count = questionSlotCount(question, examType);
    const ownHeading = ownQuestionsHeading(question, startNumber, examType);
    const elevatedDoc = toefl
      ? toeflPageInstructionDoc({
          blockInstructions: instructions,
          blockItems: items,
          question,
          inBlockContext,
          questionPage: true,
        })
      : null;
    const elevated = elevatedDoc != null;
    const showElevatedHere = elevated && !topBlockInstructionDoc;
    return (
      <Stack key={question.id} gap="md">
        {showElevatedHere && elevatedDoc ? <ToeflElevatedInstruction doc={elevatedDoc} /> : null}
        <QuestionPlayer
          question={publicView(question)}
          kicker={formatQuestionRange(startNumber, count, numberFormat)}
          answer={answers[question.id] ?? {}}
          onAnswer={(answer) => setAnswers((prev) => ({ ...prev, [question.id]: answer }))}
          startNumber={startNumber}
          numberFormat={numberFormat}
          examType={examType}
          hideQuestionsHeading={toefl || Boolean(groupTitle && ownHeading === groupTitle)}
          hideInstructions={elevated}
          hideTaskAudio={toefl}
          hideBlankNumbers={toefl}
          parenLetters={toefl}
          headingBelowInstructions={toefl}
        />
      </Stack>
    );
  });

  const instructionNode = (() => {
    if (!hasInstructions) {
      return null;
    }
    if (toefl && blockPreview) {
      return <ToeflElevatedInstruction doc={instructions} pageLead={!audioGroupListenOnly} />;
    }
    return (
      <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
        <PromptView doc={instructions} />
      </Box>
    );
  })();

  const blockElevatedTop = topBlockInstructionDoc ? (
    <ToeflElevatedInstruction doc={topBlockInstructionDoc} />
  ) : null;

  const mediaNode = (feed: ContentItem[]) => (
    feed.some(contentItemFilled) ? (
      <Box style={shouldFrameContentItems(feed, examType) ? passageFrameStyle : undefined}>
        <ContentFeedView items={feed} hideAudio={toefl && blockPreview} />
      </Box>
    ) : null
  );

  const scopeTitle = hasTitle ? (
    <Text
      fw={700}
      ta={toefl ? "center" : undefined}
      style={
        toefl
          ? { fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }
          : { fontSize: "inherit", lineHeight: "inherit" }
      }
    >
      {groupTitle}
    </Text>
  ) : null;

  let body: ReactNode;
  if (toefl && !blockPreview) {
    body = (
      <Stack gap="xl" w="100%" align="stretch">
        {scopeTitle}
        {instructionNode}
        {mediaNode(items)}
      </Stack>
    );
  } else if (!toefl) {
    body = (
      <>
        <Stack gap="sm">
          {scopeTitle}
          {instructionNode}
          {mediaNode(items)}
        </Stack>
        {questionNodes}
      </>
    );
  } else if (audioGroupListenOnly) {
    const visualItems = items.filter(
      (item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item),
    );
    const audioItems = items.filter((item) => item.kind === "audio" && item.mediaId);
    const listenSplit = visualItems.length > 0;
    body = listenSplit ? (
      <>
        {blockElevatedTop ?? instructionNode}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--mantine-spacing-md)",
            alignItems: "start",
          }}
        >
          <Box>{mediaNode(visualItems)}</Box>
          <Stack gap="sm" w="100%">
            {audioItems.length > 0 ? (
              <Box style={shouldFrameContentItems(audioItems, examType) ? passageFrameStyle : undefined}>
                <ContentFeedView items={audioItems} />
              </Box>
            ) : null}
          </Stack>
        </Box>
      </>
    ) : (
      <Stack gap="sm" w="100%">
        {instructionNode}
        {mediaNode(listenItems)}
      </Stack>
    );
  } else if (sideText) {
    body = (
      <>
        {blockElevatedTop ?? instructionNode}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--mantine-spacing-md)",
            alignItems: "start",
          }}
        >
          <Box>{mediaNode(items)}</Box>
          <Stack gap="md">{questionNodes}</Stack>
        </Box>
      </>
    );
  } else {
    body = (
      <Stack gap="md" w="100%">
        {blockElevatedTop ?? instructionNode}
        {mediaNode(items)}
        <Stack gap="md" w="100%">
          {questionNodes}
        </Stack>
      </Stack>
    );
  }

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
        {body}
        {empty ? (
          <Text size="sm" c="dimmed" fw={500}>
            Пока нечего показать участнику
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
