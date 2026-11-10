import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import type { PublicSection } from "@/entities/test/types";
import { buildRunnerPages } from "./runnerPages";

function question(id: string, partId?: string | null): PublicQuestion {
  return {
    id,
    type: "SINGLE_CHOICE",
    promptContent: { type: "doc", content: [] },
    options: { choices: [] },
    settings: {},
    scoringConfig: { points: 1 },
    partId: partId ?? null,
    required: true,
    orderIndex: 0,
  } as unknown as PublicQuestion;
}

function section(
  id: string,
  questions: PublicQuestion[],
  parts?: { id: string; title: string; instructions: string; orderIndex: number }[],
): PublicSection {
  return {
    id,
    title: id,
    instructions: "",
    orderIndex: 0,
    sectionType: "CUSTOM",
    timeLimitMinutes: null,
    parts,
    questions,
  };
}

const sections: PublicSection[] = [
  section(
    "s1",
    [question("q1", "p1"), question("q2", "p1"), question("q3", "p2")],
    [
      { id: "p1", title: "P1", instructions: "", orderIndex: 0 },
      { id: "p2", title: "P2", instructions: "", orderIndex: 1 },
    ],
  ),
  section("s2", [question("q4"), question("q5")]),
];

describe("buildRunnerPages numberScope", () => {
  it("keeps a single cursor for scope=test", () => {
    const pages = buildRunnerPages(sections, { oneQuestionPerPage: true, numberScope: "test" });
    expect(pages.map((page) => [page.questions[0]?.id, page.start])).toEqual([
      ["q1", 1],
      ["q2", 2],
      ["q3", 3],
      ["q4", 4],
      ["q5", 5],
    ]);
  });

  it("resets cursor on section boundary", () => {
    const pages = buildRunnerPages(sections, { oneQuestionPerPage: true, numberScope: "section" });
    expect(pages.find((page) => page.questions[0]?.id === "q4")?.start).toBe(1);
    expect(pages.find((page) => page.questions[0]?.id === "q5")?.start).toBe(2);
  });

  it("resets cursor on part boundary", () => {
    const pages = buildRunnerPages(sections, { oneQuestionPerPage: true, numberScope: "part" });
    expect(pages.map((page) => [page.questions[0]?.id, page.start])).toEqual([
      ["q1", 1],
      ["q2", 2],
      ["q3", 1],
      ["q4", 1],
      ["q5", 2],
    ]);
  });

  it("resets grouped pages by part when oneQuestionPerPage is false", () => {
    const pages = buildRunnerPages(sections, { oneQuestionPerPage: false, numberScope: "part" });
    expect(pages.map((page) => [page.key, page.start, page.count])).toEqual([
      ["part-p1", 1, 2],
      ["part-p2", 1, 1],
      ["section-s2", 1, 2],
    ]);
  });
});
