import type { Question } from "@/entities/question/types";
import type { MaterialBlock } from "@/entities/test/types";
import { blockItems, contentItemFilled, questionItems } from "@/features/question-types/content/contentItems";

type QuestionRef = Pick<Question, "id" | "promptContent" | "settings">;

export type QuestionVisualSource = "group" | "question";

export function resolveQuestionVisual(
  group: MaterialBlock | null | undefined,
  question: QuestionRef | null | undefined,
): QuestionVisualSource {
  if (!group || !question) {
    return "group";
  }
  const items = questionItems(question);
  if (items.some((item) => item.kind === "video" && contentItemFilled(item))) {
    return "question";
  }
  if (items.some((item) => item.kind === "image" && contentItemFilled(item))) {
    return "question";
  }
  return "group";
}

export function blockSideContentForQuestion(group: MaterialBlock, question: QuestionRef | null): boolean {
  const hideGroupVisual = resolveQuestionVisual(group, question) === "question";
  return blockItems(group).some((item) => {
    if (item.kind === "audio") {
      return false;
    }
    if (hideGroupVisual && (item.kind === "image" || item.kind === "video")) {
      return false;
    }
    return contentItemFilled(item);
  });
}

export function filterBlockItemsWithoutGroupVisual(
  items: ReturnType<typeof blockItems>,
  group: MaterialBlock,
  question: QuestionRef | null | undefined,
): ReturnType<typeof blockItems> {
  if (resolveQuestionVisual(group, question) !== "question") {
    return items;
  }
  return items.filter((item) => item.kind !== "image" && item.kind !== "video");
}