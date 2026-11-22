import { describe, expect, it } from "vitest";
import { speakingRecordLimitSeconds } from "./speakingRecordLimit";

describe("speakingRecordLimitSeconds", () => {
  it("keeps a configured limit", () => {
    expect(speakingRecordLimitSeconds(45, "TOEFL")).toBe(45);
    expect(speakingRecordLimitSeconds(45, "IELTS")).toBe(45);
  });

  it("gives TOEFL no fallback when unset", () => {
    expect(speakingRecordLimitSeconds(undefined, "TOEFL")).toBeUndefined();
    expect(speakingRecordLimitSeconds(null, "TOEFL")).toBeUndefined();
    expect(speakingRecordLimitSeconds(0, "TOEFL")).toBeUndefined();
  });

  it("keeps 120 sec fallback for non-TOEFL", () => {
    expect(speakingRecordLimitSeconds(undefined, "IELTS")).toBe(120);
    expect(speakingRecordLimitSeconds(undefined, "CUSTOM")).toBe(120);
  });
});