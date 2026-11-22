import type { ContentItem, Doc, Question } from "@/entities/question/types";
import { contentItemFilled } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";

export function toeflSharedInlineGapsQuestion(question: Pick<Question, "type">): boolean {
  return question.type === "GAPPED_TEXT" || question.type === "TEXT_ERRORS";
}

export function toeflFullWidthQuestionPane(question: Pick<Question, "type">): boolean {
  return (
    toeflSharedInlineGapsQuestion(question)
    || question.type === "ORDER_SENTENCES"
    || question.type === "SENTENCE_GAPS"
  );
}

export function previewBlockHasSideText(items: ContentItem[]): boolean {
  return items.some((item) => item.kind !== "audio" && contentItemFilled(item));
}

export type ToeflPageInstructionContext = {
  blockInstructions?: unknown;
  blockItems?: ContentItem[];
  question?: Pick<Question, "type" | "settings"> | null;
  inBlockContext?: boolean;
  questionPage?: boolean;
};

export function toeflPageInstructionDoc({
  blockInstructions,
  blockItems = [],
  question,
  inBlockContext = false,
  questionPage = false,
}: ToeflPageInstructionContext): Doc | null {
  const splitWorkspace = previewBlockHasSideText(blockItems);
  const centeredQuestionPane = Boolean(inBlockContext && !splitWorkspace);
  const fullWidthPane = question ? toeflFullWidthQuestionPane(question) : false;

  const layoutElevates = splitWorkspace || fullWidthPane || centeredQuestionPane;
  if (!questionPage && !layoutElevates) {
    return null;
  }

  const blockDoc = toInstructionDoc(blockInstructions ?? null);
  if (instructionHasContent(blockDoc)) {
    return blockDoc;
  }

  if (!question) {
    return null;
  }
  const questionDoc = toInstructionDoc(question.settings.instructions);
  return instructionHasContent(questionDoc) ? questionDoc : null;
}

export function toeflElevatesPageInstruction(ctx: ToeflPageInstructionContext): boolean {
  return toeflPageInstructionDoc(ctx) != null;
}