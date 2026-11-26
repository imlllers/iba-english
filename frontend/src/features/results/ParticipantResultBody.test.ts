import { describe, expect, it } from "vitest";
import type { TestSettings } from "@/entities/test/types";
import { mockPreviewScale } from "./ParticipantResultBody";

describe("mockPreviewScale", () => {
  it("leaves manual TOEIC sections without total", () => {
    const settings: TestSettings = {
      requireParticipantName: true,
      requireParticipantEmail: true,
      allowBackToQuestions: true,
      allowBackToPart: true,
      allowBackToSection: false,
      shuffleChoices: false,
      focusLossMaxWarnings: 2,
      audioAutoStart: true,
      videoAutoStart: true,
      questionNumberFormat: "1",
      questionNumberScope: "test",
      examType: "TOEIC",
      oneQuestionPerPage: true,
      errorExplanationMode: "off",
      showResultToParticipant: true,
      resultDetail: "score_and_scale",
      maxAttempts: null,
      timeLimitMinutes: null,
      timeLimitSectionTypes: null,
      allowEarlySubmit: true,
      autoAdvanceOnQuestionTimeout: false,
      autoAdvanceOnPartTimeout: false,
      pausePartTimerDuringAudio: false,
      availableFrom: null,
      availableUntil: null,
      emailResultToParticipant: false,
      scoreScale: {
        sourceId: "toeic_sw",
        scale: {
          id: "toeic_sw",
          title: "TOEIC Speaking & Writing",
          examType: "TOEIC",
          aggregate: "sum",
          round: { step: null, mode: "nearest" },
          sections: [
            { name: "Speaking", sectionType: "SPEAKING", min: 0, max: 200, step: 10, convert: { method: "manual" } },
            { name: "Writing", sectionType: "WRITING", min: 0, max: 200, step: 10, convert: { method: "manual" } },
          ],
          levels: [],
        },
        sections: [{ sectionIndex: 0 }, { sectionIndex: 1 }],
      },
    };
    const preview = mockPreviewScale(settings);
    expect(preview?.total).toBeNull();
    expect(preview?.totalMax).toBe(400);
    expect(preview?.sections.every((section) => section.pending)).toBe(true);
  });
});