import { Box, Card, Stack, Text } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
import type { AnswerData, ContentItem, Doc, Question } from "@/entities/question/types";
import type { ExamDisplayType, PartExample, QuestionNumberFormat, SectionType } from "@/entities/test/types";
import { toeflQuestionBlockHeading } from "@/features/question-types/numbering";
import { PartExampleView } from "@/features/question-types/content/PartExampleView";
import { partExampleFilled } from "@/features/question-types/content/partExample";
import { publicView } from "@/features/question-types/content";
import { contentItemFilled } from "@/features/question-types/content/contentItems";
import { ContentFeedView } from "@/features/question-types/content/ContentFeedView";
import { instructionHasContent } from "@/features/question-types/content/instructionDoc";
import { passageFrameStyle, shouldFrameContentItems } from "@/features/question-types/content/passageFrame";
import { formatQuestionRange, ownQuestionsHeading, questionSlotCount } from "@/features/question-types/numbering";
import { ScopeInstructionView } from "@/features/question-types/content/ScopeInstructionView";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { QuestionPlayer } from "@/features/question-types/QuestionPlayer";
import { ToeflElevatedInstruction } from "@/features/test-taking/layouts/toefl/ToeflElevatedInstruction";
import { previewBlockHasSideText, toeflPageInstructionDoc } from "@/features/test-taking/layouts/toefl/toeflPageInstruction";
import { toeicBlockGroupPreview } from "@/features/test-taking/toeicGroupLayout";

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
  example?: PartExample | null;
  sectionType?: SectionType | null;
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
  example = null,
  sectionType = null,
}: MaterialLivePreviewProps) {
  const partIntroPreview = previewScope === "part" && (examType === "TOEIC" || examType === "CUSTOM");
  const hasInstructions = instructionHasContent(instructions);
  const hasMedia = items.some(contentItemFilled);
  const hasTitle = Boolean(title?.trim());
  const hasQuestions = questions.length > 0;
  const hasExample = partIntroPreview && partExampleFilled(example);
  const empty = !hasTitle && !hasInstructions && !hasMedia && !hasQuestions && !hasExample;
  const toefl = examType === "TOEFL";
  const blockPreview = previewScope === "block";
  const blockAudio = items.some((item) => item.kind === "audio" && item.mediaId);
  const audioGroupListenOnly = toefl && blockPreview && blockAudio && questions.length > 1;
  const listenItems = items.filter((item) => item.kind !== "text");
  const toeicListening = examType === "TOEIC" && sectionType === "LISTENING";
  const toeicTaskHeading = examType === "TOEIC" && (sectionType === "SPEAKING" || sectionType === "WRITING");
  const toeicGroupLayout = toeicBlockGroupPreview(examType, blockPreview, hasQuestions, items, hasInstructions);
  const sideText = toefl
    && blockPreview
    && !audioGroupListenOnly
    && previewBlockHasSideText(items)
    && hasQuestions;
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
    const toeicSpeakingPreview = examType === "TOEIC" && sectionType === "SPEAKING";
    const readingTotal = typeof question.settings.readingSeconds === "number" && question.settings.readingSeconds > 0
      ? question.settings.readingSeconds
      : 0;
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
          hideQuestionsHeading={
            toefl || examType === "TOEIC" || Boolean(groupTitle && ownHeading === groupTitle)
          }
          hideInstructions={elevated}
          hideTaskAudio={toefl || toeicListening}
          hideBlankNumbers={toefl || examType === "TOEIC"}
          parenLetters={toefl || examType === "TOEIC"}
          headingBelowInstructions={toefl}
          questionBlockHeading={toeicTaskHeading ? toeflQuestionBlockHeading(startNumber, count) : undefined}
          speakingAutoFlow={toeicSpeakingPreview}
          speakingPreviewStatic={toeicSpeakingPreview}
          speakingPromptReady={!toeicSpeakingPreview || readingTotal <= 0}
          speakingReadingRemaining={toeicSpeakingPreview && readingTotal > 0 ? readingTotal : undefined}
          toeicGroupPane={toeicGroupLayout && blockPreview}
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
    if (examType === "TOEIC" && previewScope === "part") {
      return <ScopeInstructionView doc={instructions} examType={examType} scope="part" />;
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

  const mediaNode = (feed: ContentItem[]) => {
    const visible = toeicListening
      ? feed.filter((item) => !(item.kind === "audio" && item.mediaId))
      : feed;
    return visible.some(contentItemFilled) ? (
      <Box style={shouldFrameContentItems(visible, examType) ? passageFrameStyle : undefined}>
        <ContentFeedView items={visible} hideAudio={toefl && blockPreview} />
      </Box>
    ) : null;
  };

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
    body = partIntroPreview ? (
      <Stack gap="sm">
        {instructionNode}
        {hasExample ? <PartExampleView example={example} framed={examType !== "TOEIC"} /> : null}
      </Stack>
    ) : toeicGroupLayout ? (
      <Box
        className="runner-toeic-group-split runner-question-split runner-question-split--toeic-group"
        data-runner-layout="toeic"
        style={{
          display: "grid",
          gap: "var(--runner-toeic-column-gap)",
          alignItems: "start",
          width: "100%",
        }}
      >
        <Box className="runner-group-passage">
          {mediaNode(items)}
        </Box>
        <Stack gap="sm" className="runner-toeic-group-questions">
          {instructionNode}
          {questionNodes}
        </Stack>
      </Box>
    ) : (
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

  if (examType === "TOEIC" && (previewScope === "section" || previewScope === "part")) {
    return (
      <ToeicPreviewShell ariaLabel={ariaLabel}>
        <Stack gap="xl" w="100%" className="iba-test-copy" style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}>
          {hasTitle ? (
            <Text
              fw={700}
              ta="center"
              style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
            >
              {groupTitle}
            </Text>
          ) : null}
          {previewScope === "part" && hasInstructions ? (
            <ScopeInstructionView doc={instructions} examType="TOEIC" scope="part" />
          ) : null}
          {previewScope === "section" && hasInstructions ? (
            <Box className="iba-test-copy" style={{ fontSize: "var(--type-body, 1rem)", fontWeight: 500 }}>
              <PromptView doc={instructions} />
            </Box>
          ) : null}
          {previewScope === "part" && partExampleFilled(example) ? (
            <PartExampleView example={example} hideAudio={toeicListening} framed={false} />
          ) : null}
          {empty ? (
            <Text size="sm" c="dimmed" fw={500}>
              Пока нечего показать участнику
            </Text>
          ) : null}
        </Stack>
      </ToeicPreviewShell>
    );
  }

  if (examType === "TOEIC" && previewScope === "block") {
    return (
      <ToeicPreviewShell ariaLabel={ariaLabel}>
        <Stack gap="md" className="iba-test-copy" style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}>
          {body}
          {empty ? (
            <Text size="sm" c="dimmed" fw={500}>
              Пока нечего показать участнику
            </Text>
          ) : null}
        </Stack>
      </ToeicPreviewShell>
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
        {scopeTitle}
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

export function ToeicPreviewShell({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <Card
      component="aside"
      shadow="sm"
      bg="white"
      aria-label={ariaLabel}
      data-card-action
      data-runner-layout="toeic"
      px="md"
      py="sm"
      className="runner-task-card iba-test-copy"
      style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}
    >
      {children}
    </Card>
  );
}
