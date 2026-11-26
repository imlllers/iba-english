import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import { pageInteractionReady } from "./partTimerGate";
import type { RunnerPage } from "./runnerPages";

const question = (id: string, extras: Partial<PublicQuestion["settings"]> = {}): PublicQuestion =>
  ({
    id,
    type: "SPEAKING_RECORDING",
    promptContent: { type: "doc", content: [] },
    options: {},
    settings: extras,
    scoringConfig: { points: 1 },
  }) as unknown as PublicQuestion;

const page = (questions: PublicQuestion[]): RunnerPage =>
  ({
    key: "p",
    start: 1,
    end: questions.length,
    count: questions.length,
    questions,
    section: { id: "s", title: "Speaking", sectionType: "SPEAKING", materialBlocks: [] },
    block: null,
  }) as unknown as RunnerPage;

describe("pageInteractionReady", () => {
  it("waits for reading time before the question timer", () => {
    const item = question("q1", { readingSeconds: 45, timeLimitSeconds: 45 });
    const current = page([item]);
    expect(pageInteractionReady(current, [], new Set(), new Set(), item)).toBe(false);
    expect(pageInteractionReady(current, [], new Set(), new Set(["q1"]), item)).toBe(true);
  });

  it("is ready immediately when reading time is not set", () => {
    const item = question("q1", { timeLimitSeconds: 45 });
    expect(pageInteractionReady(page([item]), [], new Set(), new Set(), item)).toBe(true);
  });
});
