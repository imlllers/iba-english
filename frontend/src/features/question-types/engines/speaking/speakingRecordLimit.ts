import type { ExamDisplayType } from "@/entities/test/types";

export function speakingRecordLimitSeconds(
  maxSeconds: number | undefined | null,
  examType?: ExamDisplayType,
): number | undefined {
  if (maxSeconds != null && maxSeconds > 0) {
    return maxSeconds;
  }
  if (examType === "TOEFL") {
    return undefined;
  }
  return 120;
}