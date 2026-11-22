import { describe, expect, it } from "vitest";
import type { TestSettings } from "@/entities/test/types";
import type { RunnerPage } from "./runnerPages";
import { needsForwardConfirm, willBlockReturn } from "./runnerNavigation";

const settings = (patch: Partial<TestSettings> = {}): TestSettings => ({
  requireParticipantName: false,
  requireParticipantEmail: false,
  allowBackToQuestions: true,
  allowBackToPart: true,
  allowBackToSection: true,
  shuffleChoices: false,
  focusLossMaxWarnings: null,
  audioAutoStart: false,
  videoAutoStart: false,
  questionNumberFormat: "1",
  questionNumberScope: "test",
  examType: "IELTS",
  oneQuestionPerPage: true,
  errorExplanationMode: "off",
  showResultToParticipant: true,
  resultDetail: "score_only",
  maxAttempts: null,
  timeLimitMinutes: null,
  availableFrom: null,
  availableUntil: null,
  emailResultToParticipant: false,
  scoreScale: null,
  ...patch,
});

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

describe("willBlockReturn", () => {
  it("same section and part – depends on allowBackToQuestions", () => {
    const prev = page("s1", "p1", "a");
    const next = page("s1", "p1", "b");
    expect(willBlockReturn(next, prev, settings())).toBe(false);
    expect(willBlockReturn(next, prev, settings({ allowBackToQuestions: false }))).toBe(true);
  });

  it("another part – allowBackToPart", () => {
    const prev = page("s1", "p1", "a");
    const next = page("s1", "p2", "b");
    expect(willBlockReturn(next, prev, settings())).toBe(false);
    expect(willBlockReturn(next, prev, settings({ allowBackToPart: false }))).toBe(true);
  });

  it("another section – allowBackToSection", () => {
    const prev = page("s1", "p1", "a");
    const next = page("s2", "p1", "b");
    expect(willBlockReturn(next, prev, settings())).toBe(false);
    expect(willBlockReturn(next, prev, settings({ allowBackToSection: false }))).toBe(true);
  });
});

describe("needsForwardConfirm", () => {
  const pages = [page("s1", "p1", "intro"), page("s1", "p1", "q1"), page("s2", null, "s2")];

  it("no confirm in demo or same-page", () => {
    expect(needsForwardConfirm(0, 1, pages, settings({ allowBackToQuestions: false }), true)).toBe(false);
    expect(needsForwardConfirm(0, 0, pages, settings(), false)).toBe(false);
  });

  it("intro to questions without blocking back", () => {
    expect(needsForwardConfirm(0, 1, pages, settings(), false)).toBe(false);
  });

  it("cross section when return blocked", () => {
    expect(needsForwardConfirm(1, 2, pages, settings({ allowBackToSection: false }), false)).toBe(true);
  });
});