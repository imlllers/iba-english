import { describe, expect, it } from "vitest";
import type { TestScoreScale } from "./types";
import { normalizeTestSettings } from "./settings";

const toeicSwScale: TestScoreScale = {
  sourceId: "toeic_sw",
  scale: {
    id: "toeic_sw",
    title: "TOEIC Speaking & Writing",
    sections: [],
    aggregate: "sum",
    round: { step: null, mode: "nearest" },
    levels: [],
  },
  sections: [],
};

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

  it("defaults TOEFL question numbers to 1.", () => {
    const settings = normalizeTestSettings({ examType: "TOEFL" }, "TOEFL");
    expect(settings.questionNumberFormat).toBe("1.");
  });

  it("numbers TOEIC S&W by section even when settings still say test", () => {
    const settings = normalizeTestSettings({ examType: "TOEIC", questionNumberScope: "test" }, "TOEIC_SW");
    expect(settings.questionNumberScope).toBe("section");
  });

  it("numbers by section when toeic_sw scale is bound", () => {
    const settings = normalizeTestSettings({
      examType: "TOEIC",
      questionNumberScope: "test",
      scoreScale: toeicSwScale,
    });
    expect(settings.questionNumberScope).toBe("section");
  });
});