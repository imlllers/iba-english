import { describe, expect, it } from "vitest";
import { isSpeakingAutoFlow } from "./speakingAutoFlow";

describe("isSpeakingAutoFlow", () => {
  const speaking = { sectionType: "SPEAKING" as const, speakingAutoFlow: null as boolean | null };

  it("defaults on for TOEIC and TOEFL when unset", () => {
    expect(isSpeakingAutoFlow("TOEIC", speaking)).toBe(true);
    expect(isSpeakingAutoFlow("TOEFL", speaking)).toBe(true);
  });

  it("respects explicit false", () => {
    expect(isSpeakingAutoFlow("TOEIC", { ...speaking, speakingAutoFlow: false })).toBe(false);
  });

  it("is off for non-speaking sections", () => {
    expect(isSpeakingAutoFlow("TOEIC", { sectionType: "READING", speakingAutoFlow: true })).toBe(false);
  });
});