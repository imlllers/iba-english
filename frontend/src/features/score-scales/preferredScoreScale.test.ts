import { describe, expect, it } from "vitest";
import type { ScoreScale } from "@/entities/scale/types";
import { preferredScoreScale } from "./scoreScale";

const scale = (id: string, examType: ScoreScale["examType"]): ScoreScale =>
  ({
    id,
    title: id,
    examType,
    sections: [],
    aggregate: "sum",
    round: { step: null, mode: "nearest" },
    levels: [],
  });

describe("preferredScoreScale", () => {
  const scales = [
    scale("toefl", "TOEFL"),
    scale("ielts", "IELTS"),
  ];

  it("picks 2026 TOEFL when the test type is TOEFL", () => {
    expect(preferredScoreScale(scales, "TOEFL")?.id).toBe("toefl");
  });

  it("picks IELTS by exam type", () => {
    expect(preferredScoreScale(scales, "IELTS")?.id).toBe("ielts");
  });
});
