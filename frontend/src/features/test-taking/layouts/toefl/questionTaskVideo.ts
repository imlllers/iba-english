import type { PublicQuestion } from "@/entities/question/types";
import { contentItemFilled, questionItems } from "@/features/question-types/content/contentItems";

export function questionHasTaskVideo(question: Pick<PublicQuestion, "id" | "promptContent" | "settings">): boolean {
  return questionItems(question).some((item) => item.kind === "video" && contentItemFilled(item));
}

export const TOEFL_SPEAKING_VIDEO_DELAY_MS = 1000;

export function shouldAutoPlayQuestionTaskVideo(
  groupContent: boolean | undefined,
  question: Pick<PublicQuestion, "id" | "promptContent" | "settings" | "type">,
  speakingAutoFlow?: boolean,
  videoAutoStart = false,
): boolean {
  if (groupContent || !questionHasTaskVideo(question)) {
    return false;
  }
  if (speakingAutoFlow && question.type === "SPEAKING_RECORDING") {
    return false;
  }
  return videoAutoStart;
}