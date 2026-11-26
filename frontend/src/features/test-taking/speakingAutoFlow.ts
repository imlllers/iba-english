import type { ExamDisplayType, SectionType } from "@/entities/test/types";

export function isSpeakingAutoFlow(
  examType: ExamDisplayType | undefined,
  section: { sectionType: SectionType; speakingAutoFlow?: boolean | null } | undefined,
): boolean {
  if (!section || section.sectionType !== "SPEAKING") {
    return false;
  }
  if (section.speakingAutoFlow === true) {
    return true;
  }
  if (section.speakingAutoFlow === false) {
    return false;
  }
  return examType === "TOEFL" || examType === "TOEIC";
}