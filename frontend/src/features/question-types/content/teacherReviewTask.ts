import type { Question } from "@/entities/question/types";
import { ENGINES } from "../engines";
import { engineOf } from "../registry";
import { contentItemFilled, promptItemId, questionItems } from "./contentItems";
import { instructionHasContent, toInstructionDoc } from "./instructionDoc";

export function teacherReviewShowTask(question: Question): boolean {
  const instructions = toInstructionDoc(question.settings.instructions);
  if (instructionHasContent(instructions)) {
    return true;
  }
  const showPrompt = ENGINES[engineOf(question.type)].showPrompt !== false;
  if (showPrompt && instructionHasContent(question.promptContent)) {
    return true;
  }
  const items = questionItems(question);
  const promptId = promptItemId(items);
  return items.some((item) => {
    if (item.kind !== "text" || !contentItemFilled(item)) {
      return false;
    }
    if (item.id === promptId) {
      return showPrompt && instructionHasContent(question.promptContent);
    }
    return instructionHasContent(item.doc ?? { type: "doc" });
  });
}