import { describe, expect, it } from "vitest";
import type { RunnerPage } from "../../runnerPages";
import { needsToeflForwardConfirm } from "./toeflNavigation";

const page = (sectionId: string, partId: string | null, key: string): RunnerPage => ({
  key,
  sectionIndex: 0,
  section: {
    id: sectionId,
    title: sectionId,
    sectionType: "READING",
    orderIndex: 0,
    instructions: "",
    items: [],
    questions: [],
    materialBlocks: [],
    parts: [],
    timeLimitMinutes: null,
    allowBackToPart: null,
    allowBackToQuestions: null,
  },
  part: partId
    ? { id: partId, title: partId, instructions: "", orderIndex: 0, items: [], timeLimitMinutes: null, oneQuestionPerPage: null }
    : null,
  block: null,
  questions: [],
  start: 1,
  count: 1,
  end: 1,
});

describe("TOEFL forward confirm", () => {
  it("confirms only on section or part boundary", () => {
    const pages = [page("s1", "p1", "a"), page("s2", "p2", "b")];
    expect(needsToeflForwardConfirm(0, 1, pages, false)).toBe(true);
  });
});