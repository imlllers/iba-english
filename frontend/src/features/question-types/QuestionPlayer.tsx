import { Box, Stack, Text } from "@mantine/core";
import type { AnswerData, PublicQuestion } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { blankIds } from "./content";
import { ENGINES } from "./engines";
import { ContentFeedView, type ExamAudioBinding } from "./content/ContentFeedView";
import { questionItems, promptItemId } from "./content/contentItems";
import { instructionHasContent, toInstructionDoc } from "./content/instructionDoc";
import { docIsOnlyTable, passageFrameStyle } from "./content/passageFrame";
import { useMedia } from "./media/MediaContext";
import { ownQuestionsHeading, questionSlotCount } from "./numbering";
import { PromptView } from "./prompt/PromptView";
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
  hideQuestionsHeading = false,
  hideAnswer = false,
  hideBlankNumbers = examType === "TOEFL",
  parenLetters = examType === "TOEFL",
  headingBelowInstructions = examType === "TOEFL",
  plainPrompt = examType === "TOEFL" && engineOf(question.type) === "WRITTEN",
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
    plainPrompt
    || sharedPassage
    || multiSelectRange
    || question.type === "MATCHING"
    || question.type === "SENTENCE_GAPS";
  const headingHidden = hideQuestionsHeading || (examType === "TOEFL" && blankIds(question.promptContent).length === 0);
  const questionsHeading = headingHidden ? null : ownQuestionsHeading(question, startNumber, examType);
  const kickerLabel = `${kicker}${question.required ? "" : " · optional"}`;
  const kickerNode = (
    <span
      id={`q-${question.id}`}
      style={{ flex: "none", whiteSpace: "nowrap", fontSize: "inherit", lineHeight: "inherit", fontWeight: 700 }}
    >
      {kickerLabel}
    </span>
  );
  const player = (
    <Player
      question={question}
      answer={answer ?? {}}
      onAnswer={onAnswer ?? (() => undefined)}
      readOnly={readOnly || !onAnswer}
      startNumber={startNumber}
      numberFormat={numberFormat}
      hideBlankNumbers={hideBlankNumbers}
      parenLetters={parenLetters}
    />
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
      {questionsHeading && !headingBelowInstructions ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          {questionsHeading}
        </Text>
      ) : null}
      {instructionHasContent(instructions) ? (
        <Box>
          <PromptView doc={instructions} />
        </Box>
      ) : null}
      {questionsHeading && headingBelowInstructions ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          ({questionsHeading})
        </Text>
      ) : null}
      <ContentFeedView
        items={items}
        promptId={promptItemId(items)}
        renderPrompt={() => (hasPromptText ? (
          hideSideKicker ? (
            <PromptView doc={question.promptContent} />
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
        ) : null)}
        playbackLimit={question.settings.playbackLimit ?? 0}
        playbackKey={media.playbackScope ? `iba-plays:${media.playbackScope}:${question.id}` : undefined}
        examAudio={examAudio}
      />
      {hideAnswer ? null : hideSideKicker ? (
        <>
          <Text id={`q-${question.id}`} className="sr-only">{kickerLabel}</Text>
          {sharedPassage && instructionHasContent(question.promptContent) && !docIsOnlyTable(question.promptContent)
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
