import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import { pageReadingPending, questionReadingSeconds } from "./readingPhase";

const question = (readingSeconds?: number): PublicQuestion => ({
  id: "q1",
  type: "SPEAKING_RECORDING",
  required: true,
  promptContent: { type: "doc", content: [] },
  options: {},
  scoringConfig: {},
  settings: { readingSeconds },
  orderIndex: 0,
  partId: null,
  materialBlockId: null,
});

describe("reading phase", () => {
  it("reads seconds from question settings", () => {
    expect(questionReadingSeconds(question(45))).toBe(45);
    expect(questionReadingSeconds(question(0))).toBe(0);
  });

  it("detects pending reading on page", () => {
    expect(pageReadingPending([question(30)], new Set())).toBe(true);
    expect(pageReadingPending([question(30)], new Set(["q1"]))).toBe(false);
  });
});