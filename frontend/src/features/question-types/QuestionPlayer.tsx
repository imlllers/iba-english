import { Box, Stack, Text } from "@mantine/core";
import type { AnswerData, PublicQuestion } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { ENGINES } from "./engines";
import { ContentFeedView, type ExamAudioBinding } from "./content/ContentFeedView";
import { contentItemFilled, questionItems, promptItemId } from "./content/contentItems";
import { instructionHasContent, toInstructionDoc } from "./content/instructionDoc";
import { docIsOnlyTable, passageFrameStyle } from "./content/passageFrame";
import { useMedia } from "./media/MediaContext";
import { ownQuestionsHeading, questionSlotCount } from "./numbering";
import { PromptView } from "./prompt/PromptView";
import { questionHasTaskVideo } from "@/features/test-taking/layouts/toefl/questionTaskVideo";
import { engineOf } from "./registry";

type QuestionPlayerProps = {
  question: PublicQuestion;
  kicker: string;
  answer: AnswerData;
  onAnswer?: (answer: AnswerData) => void;
  readOnly?: boolean;
  startNumber?: number;
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
  examAudio?: ExamAudioBinding;
  hideQuestionsHeading?: boolean;
  hideAnswer?: boolean;
  hideBlankNumbers?: boolean;
  parenLetters?: boolean;
  headingBelowInstructions?: boolean;
  plainPrompt?: boolean;
  hideInstructions?: boolean;
  hideTaskAudio?: boolean;
  hideWordCount?: boolean;
  showWordCountToggle?: boolean;
  onToggleWordCount?: () => void;
  speakingAutoFlow?: boolean;
  speakingPromptReady?: boolean;
  onSpeakingComplete?: () => void;
  autoPlayTaskVideo?: boolean;
  listeningContentGate?: boolean;
  teacherReview?: boolean;
  demoMode?: boolean;
};

export function QuestionPlayer({
  question,
  kicker,
  answer,
  onAnswer,
  readOnly = false,
  startNumber = 1,
  numberFormat = "1",
  examType = "CUSTOM",
  examAudio,
  hideQuestionsHeading = examType === "TOEFL",
  hideAnswer = false,
  hideBlankNumbers = examType === "TOEFL",
  parenLetters = examType === "TOEFL",
  headingBelowInstructions = examType === "TOEFL",
  plainPrompt = examType === "TOEFL" && engineOf(question.type) === "WRITTEN",
  hideInstructions = false,
  hideTaskAudio = false,
  hideWordCount = false,
  showWordCountToggle = false,
  onToggleWordCount,
  speakingAutoFlow = false,
  speakingPromptReady = true,
  onSpeakingComplete,
  autoPlayTaskVideo = false,
  listeningContentGate = false,
  teacherReview = false,
  demoMode = false,
}: QuestionPlayerProps) {
  const ui = ENGINES[engineOf(question.type)];
  const Player = ui.Player;
  const media = useMedia();
  const items = questionItems(question);
  const instructions = toInstructionDoc(question.settings.instructions);
  const showPrompt = ui.showPrompt !== false;
  const hasPromptText = showPrompt && instructionHasContent(question.promptContent);
  const sharedPassage = question.type === "GAPPED_TEXT" || question.type === "TEXT_ERRORS";
  const slotCount = questionSlotCount(question, examType);
  const multiSelectRange = question.type === "MULTIPLE_SELECT" && slotCount > 1;
  const hideSideKicker =
    examType === "TOEFL"
    || plainPrompt
    || sharedPassage
    || multiSelectRange
    || question.type === "MATCHING"
    || question.type === "SENTENCE_GAPS";
  const questionsHeading = hideQuestionsHeading ? null : ownQuestionsHeading(question, startNumber, examType);
  const kickerLabel = `${kicker}${question.required ? "" : " · optional"}`;
  const kickerNode = (
    <span
      id={`q-${question.id}`}
      style={{ flex: "none", whiteSpace: "nowrap", fontSize: "inherit", lineHeight: "inherit", fontWeight: 700 }}
    >
      {kickerLabel}
    </span>
  );
  const toeflSpeakingVideoStack = examType === "TOEFL"
    && engineOf(question.type) === "SPEAKING"
    && speakingAutoFlow
    && questionHasTaskVideo(question);
  const toeflVisualSplit = !teacherReview && examType === "TOEFL" && !toeflSpeakingVideoStack && items.some(
    (item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item),
  );
  const visualTaskItems = toeflVisualSplit
    ? items.filter((item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item))
    : [];
  const bodyTaskItems = toeflSpeakingVideoStack
    ? items.filter((item) => item.kind !== "video")
    : toeflVisualSplit
      ? items.filter((item) => item.kind !== "image" && item.kind !== "video")
      : items;
  const gatedBodyItems = listeningContentGate
    ? bodyTaskItems.filter((item) => (item.kind === "audio" && item.mediaId)
      || ((item.kind === "image" || item.kind === "video") && contentItemFilled(item)))
    : bodyTaskItems;
  const showPromptText = !listeningContentGate && hasPromptText;
  const renderPrompt = () => (showPromptText ? (
    hideSideKicker ? (
      examType === "TOEFL" ? (
        <Box className="question-prompt-row">
          <PromptView doc={question.promptContent} />
        </Box>
      ) : (
        <PromptView doc={question.promptContent} />
      )
    ) : (
      <Box
        className="question-prompt-row"
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "baseline",
        }}
      >
        {kickerNode}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <PromptView doc={question.promptContent} />
        </Box>
      </Box>
    )
  ) : null);
  const contentFeed = (feedItems: typeof items) => (
    <ContentFeedView
      items={feedItems}
      promptId={promptItemId(items)}
      renderPrompt={renderPrompt}
      playbackLimit={question.settings.playbackLimit ?? 0}
      playbackKey={media.playbackScope ? `iba-plays:${media.playbackScope}:${question.id}` : undefined}
      examAudio={examAudio}
      hideAudio={hideTaskAudio || teacherReview}
      autoPlayVideo={autoPlayTaskVideo}
      hideVideoControls={examType === "TOEFL" && !teacherReview}
      teacherReview={teacherReview}
    />
  );
  const player = (
    <Player
      question={question}
      answer={answer ?? {}}
      onAnswer={onAnswer ?? (() => undefined)}
      readOnly={readOnly || !onAnswer}
      startNumber={startNumber}
      numberFormat={numberFormat}
      examType={examType}
      hideBlankNumbers={hideBlankNumbers}
      parenLetters={parenLetters}
      hideWordCount={hideWordCount}
      showWordCountToggle={showWordCountToggle}
      onToggleWordCount={onToggleWordCount}
      demoMode={demoMode}
      {...(engineOf(question.type) === "SPEAKING" ? {
        autoFlow: speakingAutoFlow,
        promptAudioReady: speakingPromptReady,
        promptAudioInFeed: !hideTaskAudio,
        onComplete: onSpeakingComplete,
        examAudio,
        media,
      } : {})}
    />
  );
  const answerNode = hideAnswer || listeningContentGate ? null : hideSideKicker ? (
    <>
      <Text id={`q-${question.id}`} className="sr-only">{kickerLabel}</Text>
      {sharedPassage && examType !== "TOEFL" && instructionHasContent(question.promptContent) && !docIsOnlyTable(question.promptContent)
        ? <Box style={passageFrameStyle}>{player}</Box>
        : player}
    </>
  ) : hasPromptText ? (
    <Box
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "baseline",
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "none",
          whiteSpace: "nowrap",
          fontSize: "inherit",
          lineHeight: "inherit",
          fontWeight: 700,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {kickerLabel}
      </span>
      <Box style={{ flex: 1, minWidth: 0 }}>{player}</Box>
    </Box>
  ) : (
    <Box
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "baseline",
      }}
    >
      {kickerNode}
      <Box style={{ flex: 1, minWidth: 0 }}>{player}</Box>
    </Box>
  );
  const taskBody = (
    <Stack gap="calc(var(--mantine-spacing-md) / 2)">
      {contentFeed(gatedBodyItems)}
      {answerNode}
    </Stack>
  );
  return (
    <Stack
      gap="calc(var(--mantine-spacing-md) / 2)"
      component="article"
      aria-labelledby={`q-${question.id}`}
      data-exam={examType}
      className="iba-test-copy"
      style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}
    >
      {questionsHeading && !teacherReview && !headingBelowInstructions ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          {questionsHeading}
        </Text>
      ) : null}
      {!hideInstructions && instructionHasContent(instructions) ? (
        <Box>
          <PromptView doc={instructions} />
        </Box>
      ) : null}
      {questionsHeading && !teacherReview && headingBelowInstructions ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          ({questionsHeading})
        </Text>
      ) : null}
      {toeflVisualSplit ? (
        <Box
          className="runner-question-split"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--mantine-spacing-md)",
            alignItems: "start",
            width: "100%",
          }}
        >
          <Box>{contentFeed(visualTaskItems)}</Box>
          {taskBody}
        </Box>
      ) : (
        taskBody
      )}
    </Stack>
  );
}

export function isAnswered(question: PublicQuestion, answer: AnswerData | undefined) {
  if (!answer) {
    return false;
  }
  return ENGINES[engineOf(question.type)].answered(answer);
}
