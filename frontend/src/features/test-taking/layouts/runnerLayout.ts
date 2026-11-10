import type { ExamDisplayType } from "@/entities/test/types";

export type RunnerLayout = "ielts" | "toeic" | "toefl";

export function runnerLayoutOf(examType: ExamDisplayType | null | undefined): RunnerLayout {
  if (examType === "TOEIC") return "toeic";
  if (examType === "TOEFL") return "toefl";
  return "ielts";
}
