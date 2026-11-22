import { describe, expect, it } from "vitest";
import { partLimitSeconds } from "./partTiming";

describe("partLimitSeconds", () => {
  it("prefers explicit seconds", () => {
    expect(partLimitSeconds({ id: "p", title: "", instructions: "", orderIndex: 0, timeLimitMinutes: 10, timeLimitSeconds: 390 })).toBe(390);
  });

  it("converts minutes when seconds absent", () => {
    expect(partLimitSeconds({ id: "p", title: "", instructions: "", orderIndex: 0, timeLimitMinutes: 9 })).toBe(540);
  });
});