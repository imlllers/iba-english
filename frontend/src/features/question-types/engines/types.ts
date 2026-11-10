import type { ComponentType } from "react";
import type { AnswerData, PublicQuestion, Question } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import type { PromptMode } from "../prompt/RichTextEditor";

export type EditorProps = {
  question: Question;
  update: (patch: Partial<Question>) => void;
  part?: "body" | "score";
  startNumber?: number;
  examType?: ExamDisplayType;
};

export type PlayerProps = {
  question: PublicQuestion;
  answer: AnswerData;
  onAnswer: (answer: AnswerData) => void;
  readOnly: boolean;
  startNumber?: number;
  numberFormat?: QuestionNumberFormat;
  hideBlankNumbers?: boolean;
  parenLetters?: boolean;
};

export type EngineUi = {
  prompt: PromptMode;
  showPrompt?: boolean;
  Content?: ComponentType<EditorProps>;
  Answers: ComponentType<EditorProps>;
  Player: ComponentType<PlayerProps>;
  answered: (answer: AnswerData) => boolean;
};
