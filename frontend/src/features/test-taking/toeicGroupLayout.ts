import type { ContentItem } from "@/entities/question/types";
import type { ExamDisplayType, MaterialBlock } from "@/entities/test/types";
import { contentItemFilled } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { blockHasSideText } from "./layouts/toefl/toeflPages";

export function toeicMaterialGroupLayout(
  examType: ExamDisplayType | null | undefined,
  block: MaterialBlock | null | undefined,
  options?: { questionCount?: number; items?: ContentItem[] },
): boolean {
  if (examType !== "TOEIC" || !block) {
    return false;
  }
  if (options?.questionCount === 0) {
    return false;
  }
  const hasInstructions = instructionHasContent(toInstructionDoc(block.instructions));
  if (options?.items) {
    const filled = options.items.some(contentItemFilled);
    return hasInstructions || filled;
  }
  return hasInstructions || blockHasSideText(block);
}

export function toeicBlockGroupPreview(
  examType: ExamDisplayType | null | undefined,
  blockPreview: boolean,
  hasQuestions: boolean,
  items: ContentItem[],
  hasInstructions: boolean,
): boolean {
  if (examType !== "TOEIC" || !blockPreview || !hasQuestions) {
    return false;
  }
  const side = items.some((item) => item.kind !== "audio" && contentItemFilled(item));
  return hasInstructions || side;
}