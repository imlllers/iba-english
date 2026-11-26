import { describe, expect, it } from "vitest";
import { readSpeakingPrepStart, speakingPrepSecondsLeft, speakingPrepStorageKey } from "./speakingPrep";

describe("speakingPrep", () => {
  it("builds a stable storage key", () => {
    expect(speakingPrepStorageKey("attempt", "q1")).toBe("iba-speak-prep:attempt:q1");
  });

  it("keeps the original start across reloads", () => {
    const key = speakingPrepStorageKey("attempt", "q1");
    sessionStorage.setItem(key, "1000");
    expect(readSpeakingPrepStart(key, 5000)).toBe(1000);
  });

  it("counts remaining preparation from the saved start", () => {
    expect(speakingPrepSecondsLeft(1_000, 30, 11_000)).toBe(20);
    expect(speakingPrepSecondsLeft(1_000, 30, 40_000)).toBe(0);
  });
});
