import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import type { RunnerPage } from "./runnerPages";
import { speakingPromptCanStart } from "./pageAudioGate";

const question = (id: string, extras: Partial<PublicQuestion["settings"]> = {}): PublicQuestion =>
  ({
    id,
    type: "SPEAKING",
    promptContent: { type: "doc", content: [] },
    options: {},
    settings: { content: [{ id: "a", kind: "audio", mediaId: "m" }], ...extras },
    scoringConfig: { points: 1 },
  }) as unknown as PublicQuestion;

const page = (blockId?: string): RunnerPage =>
  ({
    key: "p",
    start: 1,
    end: 1,
    count: 1,
    questions: [question("q1")],
    section: { id: "s", title: "Speaking", sectionType: "SPEAKING", materialBlocks: [] },
    block: blockId
      ? { id: blockId, items: [{ id: "ba", kind: "audio", mediaId: "bm" }] }
      : null,
  }) as unknown as RunnerPage;

describe("speakingPromptCanStart", () => {
  it("starts immediately when there is no block audio or reading", () => {
    expect(speakingPromptCanStart(page(), question("q1"), new Set(), new Set())).toBe(true);
  });

  it("waits for block audio, not the question prompt audio", () => {
    const current = page("block-1");
    current.questions[0] = { ...question("q1"), materialBlockId: "block-1" } as PublicQuestion;
    expect(speakingPromptCanStart(current, current.questions[0], new Set(), new Set())).toBe(false);
    expect(speakingPromptCanStart(current, current.questions[0], new Set(["block:ba"]), new Set())).toBe(true);
  });
});
