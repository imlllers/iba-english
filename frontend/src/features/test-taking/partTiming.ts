import type { SectionPart } from "@/entities/test/types";

export function partLimitSeconds(part: SectionPart | null | undefined): number {
  if (!part) {
    return 0;
  }
  if (typeof part.timeLimitSeconds === "number" && part.timeLimitSeconds > 0) {
    return part.timeLimitSeconds;
  }
  if (typeof part.timeLimitMinutes === "number" && part.timeLimitMinutes > 0) {
    return part.timeLimitMinutes * 60;
  }
  return 0;
}