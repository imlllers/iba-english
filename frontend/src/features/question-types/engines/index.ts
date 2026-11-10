import type { AnswerData, Engine } from "@/entities/question/types";
import { ChoiceAnswers } from "./choice/ChoiceAnswers";
import { ChoiceContent } from "./choice/ChoiceContent";
import { ChoicePlayer } from "./choice/ChoicePlayer";
import { ErrorHuntAnswers } from "./error-hunt/ErrorHuntAnswers";
import { ErrorHuntContent } from "./error-hunt/ErrorHuntContent";
import { ErrorHuntPlayer } from "./error-hunt/ErrorHuntPlayer";
import { InlineAnswers } from "./inline/InlineAnswers";
import { InlineContent } from "./inline/InlineContent";
import { InlinePlayer } from "./inline/InlinePlayer";
import { JudgementAnswers } from "./judgement/JudgementAnswers";
import { JudgementContent } from "./judgement/JudgementContent";
import { JudgementPlayer } from "./judgement/JudgementPlayer";
import { MatchingAnswers } from "./matching/MatchingAnswers";
import { MatchingContent } from "./matching/MatchingContent";
import { MatchingPlayer } from "./matching/MatchingPlayer";
import { OrderingAnswers } from "./ordering/OrderingAnswers";
import { OrderingContent } from "./ordering/OrderingContent";
import { OrderingPlayer } from "./ordering/OrderingPlayer";
import { SpeakingAnswers } from "./speaking/SpeakingAnswers";
import { SpeakingPlayer } from "./speaking/SpeakingPlayer";
import { TextAnswerAnswers } from "./text-answer/TextAnswerAnswers";
import { TextAnswerContent } from "./text-answer/TextAnswerContent";
import { TextAnswerPlayer } from "./text-answer/TextAnswerPlayer";
import { TransformAnswers } from "./transform/TransformAnswers";
import { TransformContent } from "./transform/TransformContent";
import { TransformPlayer } from "./transform/TransformPlayer";
import type { EngineUi } from "./types";
import { WrittenAnswers } from "./written/WrittenAnswers";
import { WrittenPlayer } from "./written/WrittenPlayer";

const filledText = (answer: AnswerData) => String(answer.text ?? "").trim() !== "";
const filledMap = (field: string) => (answer: AnswerData) =>
  Object.values((answer[field] as Record<string, unknown>) ?? {}).some((value) => value !== "" && value !== null && value !== undefined);
const filledList = (field: string) => (answer: AnswerData) => Array.isArray(answer[field]) && (answer[field] as unknown[]).length > 0;

export const ENGINES: Record<Engine, EngineUi> = {
  CHOICE: { prompt: "plain", Content: ChoiceContent, Answers: ChoiceAnswers, Player: ChoicePlayer, answered: (answer) => Boolean(answer.optionId) },
  MULTI_CHOICE: { prompt: "plain", Content: ChoiceContent, Answers: ChoiceAnswers, Player: ChoicePlayer, answered: filledList("optionIds") },
  JUDGEMENT: { prompt: "plain", Content: JudgementContent, Answers: JudgementAnswers, Player: JudgementPlayer, answered: filledMap("answers") },
  INLINE: { prompt: "inline", showPrompt: false, Content: InlineContent, Answers: InlineAnswers, Player: InlinePlayer, answered: filledMap("blanks") },
  TEXT_ANSWER: { prompt: "plain", Content: TextAnswerContent, Answers: TextAnswerAnswers, Player: TextAnswerPlayer, answered: filledText },
  TRANSFORM: { prompt: "plain", Content: TransformContent, Answers: TransformAnswers, Player: TransformPlayer, answered: filledText },
  MATCHING: { prompt: "plain", Content: MatchingContent, Answers: MatchingAnswers, Player: MatchingPlayer, answered: filledMap("pairs") },
  ORDERING: {
    prompt: "plain",
    Content: OrderingContent,
    Answers: OrderingAnswers,
    Player: OrderingPlayer,
    answered: (answer) =>
      Array.isArray(answer.order) &&
      (answer.order as unknown[]).some((id) => typeof id === "string" && id.length > 0),
  },
  ERROR_HUNT: { prompt: "plain", showPrompt: false, Content: ErrorHuntContent, Answers: ErrorHuntAnswers, Player: ErrorHuntPlayer, answered: (answer) => Object.keys((answer.corrections as object) ?? {}).length > 0 },
  WRITTEN: { prompt: "plain", Answers: WrittenAnswers, Player: WrittenPlayer, answered: filledText },
  SPEAKING: { prompt: "plain", Answers: SpeakingAnswers, Player: SpeakingPlayer, answered: (answer) => Boolean(answer.mediaId) },
};
