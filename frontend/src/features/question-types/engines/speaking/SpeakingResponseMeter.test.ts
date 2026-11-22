import { describe, expect, it } from "vitest";
import { formatClock } from "@/shared/lib/format";

describe("TOEFL speaking response countdown", () => {
  it("formats remaining seconds like the on-screen timer", () => {
    expect(formatClock(7)).toBe("00:07");
    expect(formatClock(6)).toBe("00:06");
    expect(formatClock(0)).toBe("00:00");
  });
});