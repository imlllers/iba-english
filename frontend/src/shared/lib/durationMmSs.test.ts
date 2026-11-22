import { describe, expect, it } from "vitest";
import { mmSsToSeconds, secondsToMmSs } from "./durationMmSs";

describe("durationMmSs", () => {
  it("round-trips 6:30", () => {
    expect(secondsToMmSs(390)).toBe("6:30");
    expect(mmSsToSeconds("6:30")).toBe(390);
  });

  it("treats a bare number as minutes", () => {
    expect(mmSsToSeconds("30")).toBe(1800);
  });

  it("clears an empty value", () => {
    expect(mmSsToSeconds("")).toBeNull();
    expect(mmSsToSeconds("   ")).toBeNull();
  });
});