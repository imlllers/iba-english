import { describe, expect, it } from "vitest";
import { normalizeTestSettings } from "./settings";

describe("normalizeTestSettings", () => {
  it("defaults new timing flags to off", () => {
    const settings = normalizeTestSettings({}, "IELTS");
    expect(settings.autoAdvanceOnPartTimeout).toBe(false);
    expect(settings.pausePartTimerDuringAudio).toBe(false);
  });

  it("keeps enabled timing flags", () => {
    const settings = normalizeTestSettings({
      autoAdvanceOnPartTimeout: true,
      pausePartTimerDuringAudio: true,
    }, "TOEFL");
    expect(settings.autoAdvanceOnPartTimeout).toBe(true);
    expect(settings.pausePartTimerDuringAudio).toBe(true);
  });
});