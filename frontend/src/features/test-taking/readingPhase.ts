import type { PublicQuestion } from "@/entities/question/types";

export function questionReadingSeconds(question: PublicQuestion): number {
  const value = question.settings.readingSeconds;
  return typeof value === "number" && value > 0 ? value : 0;
}

export function pageReadingPending(questions: PublicQuestion[], readingDone: ReadonlySet<string>) {
  return questions.some((question) => {
    const seconds = questionReadingSeconds(question);
    return seconds > 0 && !readingDone.has(question.id);
  });
}