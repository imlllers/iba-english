import { Box, Stack, Text } from "@mantine/core";
import type { AnswerData, PublicQuestion } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { ENGINES } from "./engines";
import { ContentFeedView, type ExamAudioBinding } from "./content/ContentFeedView";
import { contentItemFilled, questionItems, promptItemId } from "./content/contentItems";
import { instructionHasContent, toInstructionDoc } from "./content/instructionDoc";
import { docIsOnlyTable, docWithoutTables, docWithTablesOnly, passageFrameStyle } from "./content/passageFrame";
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
  speakingPreviewStatic?: boolean;
  speakingPromptReady?: boolean;
  speakingReadingRemaining?: number;
  onSpeakingComplete?: () => void;
  autoPlayTaskVideo?: boolean;
  listeningContentGate?: boolean;
  teacherReview?: boolean;
  demoMode?: boolean;
  toeicGroupPane?: boolean;
  questionBlockHeading?: string;
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
  hideQuestionsHeading = examType === "TOEFL" || examType === "TOEIC",
  hideAnswer = false,
  hideBlankNumbers = examType === "TOEFL",
  parenLetters = examType === "TOEFL" || examType === "TOEIC",
  headingBelowInstructions = examType === "TOEFL",
  plainPrompt = examType === "TOEFL" && engineOf(question.type) === "WRITTEN",
  hideInstructions = false,
  hideTaskAudio = false,
  hideWordCount = false,
  showWordCountToggle = false,
  onToggleWordCount,
  speakingAutoFlow = false,
  speakingPreviewStatic = false,
  speakingPromptReady = true,
  speakingReadingRemaining,
  onSpeakingComplete,
  autoPlayTaskVideo = false,
  listeningContentGate = false,
  teacherReview = false,
  demoMode = false,
  toeicGroupPane = false,
  questionBlockHeading,
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
  const speakingQuestion = engineOf(question.type) === "SPEAKING";
  const stackedSpeakingExam = examType === "TOEFL" || examType === "TOEIC";
  const stackedSpeakingTask = stackedSpeakingExam && speakingQuestion && speakingAutoFlow && !teacherReview;
  const hasVisualTaskMedia = items.some(
    (item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item),
  );
  const toeicTaskWithBlockHeading = examType === "TOEIC"
    && !teacherReview
    && !toeicGroupPane
    && Boolean(questionBlockHeading);
  const writtenQuestion = engineOf(question.type) === "WRITTEN";
  const toeicPictureTaskStack = toeicTaskWithBlockHeading
    && !speakingQuestion
    && hasVisualTaskMedia;
  const toeicWritingVisualSplit = toeicPictureTaskStack && writtenQuestion;
  const hideSideKicker =
    examType === "TOEFL"
    || stackedSpeakingTask
    || toeicTaskWithBlockHeading
    || plainPrompt
    || sharedPassage
    || multiSelectRange
    || question.type === "MATCHING"
    || question.type === "SENTENCE_GAPS";
  const questionsHeading = hideQuestionsHeading ? null : ownQuestionsHeading(question, startNumber, examType);
  const kickerLabel = `${kicker}${question.required ? "" : " · optional"}`;
  const kickerNode = (
    <span id={`q-${question.id}`} className="question-kicker">
      {kickerLabel}
    </span>
  );
  const toeflSpeakingVideoStack = stackedSpeakingExam
    && speakingQuestion
    && speakingAutoFlow
    && questionHasTaskVideo(question);
  const taskVisualSplit = !teacherReview
    && (examType === "TOEFL" || examType === "TOEIC")
    && !toeflSpeakingVideoStack
    && !stackedSpeakingTask
    && !toeicTaskWithBlockHeading
    && !toeicPictureTaskStack
    && hasVisualTaskMedia;
  const toeicCenteredTask = examType === "TOEIC"
    && !teacherReview
    && !taskVisualSplit
    && !toeicWritingVisualSplit
    && !toeicGroupPane;
  const visualTaskItems = (taskVisualSplit || toeicWritingVisualSplit)
    ? items.filter((item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item))
    : [];
  const bodyTaskItems = (() => {
    let body = items;
    if (toeflSpeakingVideoStack) {
      body = body.filter((item) => item.kind !== "video");
    } else if (taskVisualSplit) {
      body = body.filter((item) => item.kind !== "image" && item.kind !== "video");
    }
    if (stackedSpeakingTask && examType === "TOEIC") {
      body = body.filter((item) => {
        if (item.kind === "audio" && item.mediaId) {
          return false;
        }
        if (item.kind === "video" && contentItemFilled(item)) {
          return false;
        }
        return true;
      });
    }
    return body;
  })();
  const hideSpeakingPromptInFeed = stackedSpeakingTask && examType === "TOEIC";
  const gatedBodyItems = listeningContentGate
    ? bodyTaskItems.filter((item) => (item.kind === "audio" && item.mediaId)
      || ((item.kind === "image" || item.kind === "video") && contentItemFilled(item)))
    : bodyTaskItems;
  const showPromptText = !listeningContentGate && hasPromptText;
  const promptTextItemId = promptItemId(items);
  const toeicWrittenLeftStimulusItems = toeicCenteredTask && writtenQuestion
    ? gatedBodyItems.filter((item) => {
      if (!contentItemFilled(item)) {
        return false;
      }
      if (item.id !== promptTextItemId) {
        return true;
      }
      if (item.kind === "text") {
        const doc = item.doc ?? question.promptContent;
        return docIsOnlyTable(doc);
      }
      return false;
    })
    : [];
  const toeicPromptTableDoc = toeicCenteredTask && writtenQuestion && showPromptText
    ? docWithTablesOnly(question.promptContent)
    : null;
  const toeicWrittenStimulusSplit = toeicCenteredTask && writtenQuestion
    && (toeicWrittenLeftStimulusItems.length > 0 || Boolean(toeicPromptTableDoc));
  const toeicWrittenTaskDirectionsDoc = toeicWrittenStimulusSplit
    ? (instructionHasContent(instructions)
      ? instructions
      : showPromptText && !docIsOnlyTable(question.promptContent)
        ? (docWithoutTables(question.promptContent) ?? question.promptContent)
        : null)
    : null;
  const suppressQuestionInstructions = toeicWrittenStimulusSplit
    && Boolean(toeicWrittenTaskDirectionsDoc)
    && instructionHasContent(instructions);
  const toeicWrittenPromptAboveAnswer = toeicCenteredTask && writtenQuestion && showPromptText && !toeicWrittenStimulusSplit;
  const stimulusFeedItems = toeicWrittenPromptAboveAnswer
    ? gatedBodyItems.filter((item) => item.id !== promptTextItemId)
    : gatedBodyItems;
  const toeicWritingSplitGrid = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "var(--runner-toeic-column-gap)",
    alignItems: "start",
    width: "100%",
  } as const;
  const renderPrompt = () => (showPromptText ? (
    hideSideKicker ? (
      stackedSpeakingExam && speakingQuestion ? (
        <Box className="question-prompt-row">
          <PromptView doc={question.promptContent} />
        </Box>
      ) : toeicPictureTaskStack ? (
        <Box className="question-prompt-row" ta="center">
          <PromptView doc={question.promptContent} />
        </Box>
      ) : examType === "TOEFL" ? (
        <Box className="question-prompt-row">
          <PromptView doc={question.promptContent} />
        </Box>
      ) : (
        <PromptView doc={question.promptContent} />
      )
    ) : (
      <Box className="question-prompt-row">
        {kickerNode}
        <Box className="question-side__body">
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
      hideAudio={hideTaskAudio || teacherReview || hideSpeakingPromptInFeed}
      autoPlayVideo={autoPlayTaskVideo}
      hideVideoControls={stackedSpeakingExam && speakingAutoFlow && !teacherReview}
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
        speakingPreviewStatic,
        promptAudioReady: speakingPromptReady,
        promptAudioInFeed: !hideTaskAudio && !hideSpeakingPromptInFeed,
        speakingReadingRemaining,
        onComplete: onSpeakingComplete,
        examAudio,
        media,
      } : {})}
    />
  );
  const toeicWrittenAnswerStack = toeicWrittenStimulusSplit ? (
    <Stack gap="calc(var(--mantine-spacing-md) / 2)" w="100%">
      {toeicWrittenTaskDirectionsDoc ? (
        <Box className="question-prompt-row">
          <PromptView doc={toeicWrittenTaskDirectionsDoc} />
        </Box>
      ) : null}
      {player}
    </Stack>
  ) : null;
  const toeicWrittenStimulusColumn = toeicWrittenStimulusSplit ? (
    <Stack gap="md" w="100%">
      {contentFeed(toeicWrittenLeftStimulusItems)}
      {toeicWrittenLeftStimulusItems.length === 0 && toeicPromptTableDoc ? (
        <PromptView doc={toeicPromptTableDoc} />
      ) : null}
    </Stack>
  ) : null;
  const answerNode = hideAnswer || listeningContentGate ? null : hideSideKicker ? (
    <>
      <Text id={`q-${question.id}`} className="sr-only">{kickerLabel}</Text>
      {toeicWrittenAnswerStack ?? (toeicWrittenPromptAboveAnswer ? (
        <Stack gap="calc(var(--mantine-spacing-md) / 2)" w="100%">
          <Box className="question-prompt-row">
            <PromptView doc={question.promptContent} />
          </Box>
          {player}
        </Stack>
      ) : sharedPassage && examType !== "TOEFL" && instructionHasContent(question.promptContent) && !docIsOnlyTable(question.promptContent)
        ? <Box style={passageFrameStyle}>{player}</Box>
        : player)}
    </>
  ) : hasPromptText ? (
    <Box className="question-answer-row">
      <span aria-hidden className="question-kicker question-kicker--ghost">
        {kickerLabel}
      </span>
      <Box className="question-side__body">{player}</Box>
    </Box>
  ) : (
    <Box className="question-answer-row">
      {kickerNode}
      <Box className="question-side__body">{player}</Box>
    </Box>
  );
  const taskBody = (
    <Stack gap="calc(var(--mantine-spacing-md) / 2)">
      {contentFeed(stimulusFeedItems)}
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
      {!hideInstructions && !suppressQuestionInstructions && instructionHasContent(instructions) ? (
        <Box>
          <PromptView doc={instructions} />
        </Box>
      ) : null}
      {questionsHeading && !teacherReview && headingBelowInstructions ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          ({questionsHeading})
        </Text>
      ) : null}
      {questionBlockHeading && !teacherReview ? (
        <Text
          fw={700}
          ta={examType === "TOEIC" ? "center" : undefined}
          w={examType === "TOEIC" ? "100%" : undefined}
          mb={examType === "TOEIC" ? "md" : undefined}
          style={
            examType === "TOEIC"
              ? { fontSize: "var(--type-h6-size)", lineHeight: "var(--type-h6-line)" }
              : { fontSize: "inherit", lineHeight: "inherit" }
          }
        >
          {questionBlockHeading}
        </Text>
      ) : null}
      {toeicWritingVisualSplit ? (
        <Box
          className="runner-question-split runner-question-split--toeic-writing"
          data-task-visual-split=""
          style={toeicWritingSplitGrid}
        >
          <Box className="runner-question-split__media">
            <Stack gap="md" align="stretch">
              {contentFeed(visualTaskItems)}
              {showPromptText ? (
                <Box className="question-prompt-row" ta="center">
                  <PromptView doc={question.promptContent} />
                </Box>
              ) : null}
            </Stack>
          </Box>
          <Box className="runner-question-split__task">{answerNode}</Box>
        </Box>
      ) : taskVisualSplit ? (
        <Box
          className="runner-question-split"
          data-task-visual-split=""
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--mantine-spacing-md)",
            alignItems: "start",
            width: "100%",
          }}
        >
          <Box className="runner-question-split__media">{contentFeed(visualTaskItems)}</Box>
          <Box className="runner-question-split__task">{taskBody}</Box>
        </Box>
      ) : toeicWrittenStimulusSplit && toeicWrittenStimulusColumn && answerNode ? (
        <Box
          className="runner-question-split runner-question-split--toeic-writing"
          data-task-visual-split=""
          style={toeicWritingSplitGrid}
        >
          <Box className="runner-question-split__media">{toeicWrittenStimulusColumn}</Box>
          <Box className="runner-question-split__task">{answerNode}</Box>
        </Box>
      ) : toeicCenteredTask ? (
        <Box w="100%" maw="var(--runner-toefl-centered-pane-max)" mx="auto" className="runner-toeic-centered-task">
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
