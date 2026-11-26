import type { ExamDisplayType } from "@/entities/test/types";

export type RunnerLayout = "ielts" | "toeic" | "toefl";

export function runnerLayoutOf(examType: ExamDisplayType | null | undefined): RunnerLayout {
  if (examType === "TOEIC") return "toeic";
  if (examType === "TOEFL") return "toefl";
  return "ielts";
}

export function usesStackedTakeChrome(examType: ExamDisplayType | null | undefined): boolean {
  return examType === "TOEFL" || examType === "TOEIC";
}

export function stackedLayoutOf(examType: ExamDisplayType | null | undefined): "toefl" | "toeic" {
  return examType === "TOEIC" ? "toeic" : "toefl";
}
