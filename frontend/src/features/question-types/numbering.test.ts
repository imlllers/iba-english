import { describe, expect, it } from "vitest";
import {
  formatQuestionRange,
  formatQuestionsHeading,
  numberQuestionsByScope,
  numberQuestionsInTest,
  ownQuestionsHeading,
  questionSlotCount,
} from "./numbering";

type Q = { id: string; type: "SINGLE_CHOICE"; partId?: string | null };

function part(id: string, orderIndex: number) {
  return { id, title: id, instructions: "", orderIndex };
}

function section(
  id: string,
  questions: Q[],
  parts?: ReturnType<typeof part>[],
) {
  return { id, questions, parts };
}

const sections = [
  section(
    "s1",
    [
      { id: "q1", type: "SINGLE_CHOICE", partId: "p1" },
      { id: "q2", type: "SINGLE_CHOICE", partId: "p1" },
      { id: "q3", type: "SINGLE_CHOICE", partId: "p2" },
    ],
    [part("p1", 0), part("p2", 1)],
  ),
  section("s2", [
    { id: "q4", type: "SINGLE_CHOICE" },
    { id: "q5", type: "SINGLE_CHOICE" },
  ]),
];

describe("numberQuestionsByScope", () => {
  it("keeps continuous numbers across the whole test", () => {
    const map = numberQuestionsByScope(sections, "test");
    expect([...map.entries()].map(([id, entry]) => [id, entry.start])).toEqual([
      ["q1", 1],
      ["q2", 2],
      ["q3", 3],
      ["q4", 4],
      ["q5", 5],
    ]);
  });

  it("resets at each section", () => {
    const map = numberQuestionsByScope(sections, "section");
    expect(map.get("q1")?.start).toBe(1);
    expect(map.get("q3")?.start).toBe(3);
    expect(map.get("q4")?.start).toBe(1);
    expect(map.get("q5")?.start).toBe(2);
  });

  it("resets at each part; section without parts acts as one part", () => {
    const map = numberQuestionsByScope(sections, "part");
    expect(map.get("q1")?.start).toBe(1);
    expect(map.get("q2")?.start).toBe(2);
    expect(map.get("q3")?.start).toBe(1);
    expect(map.get("q4")?.start).toBe(1);
    expect(map.get("q5")?.start).toBe(2);
  });
});

describe("numberQuestionsInTest", () => {
  it("returns flat list in section order with scoped starts", () => {
    const numbered = numberQuestionsInTest(sections, "part");
    expect(numbered.map((entry) => [entry.question.id, entry.start])).toEqual([
      ["q1", 1],
      ["q2", 2],
      ["q3", 1],
      ["q4", 1],
      ["q5", 2],
    ]);
  });
});

describe("MULTI_SELECT IELTS slots", () => {
  it("counts correct answers as question slots only for IELTS", () => {
    const question = {
      id: "m1",
      type: "MULTIPLE_SELECT" as const,
      answerKey: { correctOptionIds: ["a", "d"] },
    };
    expect(questionSlotCount(question, "IELTS")).toBe(2);
    expect(questionSlotCount(question, "CUSTOM")).toBe(1);
    expect(questionSlotCount(question)).toBe(1);
  });

  it("uses public selectCount when answerKey is hidden (IELTS only)", () => {
    const question = {
      id: "m1",
      type: "MULTIPLE_SELECT" as const,
      settings: { selectCount: 2 },
    };
    expect(questionSlotCount(question, "IELTS")).toBe(2);
    expect(questionSlotCount(question, "TOEFL")).toBe(1);
  });

  it("formats question ranges with an en dash", () => {
    expect(formatQuestionsHeading(19, 20)).toBe("Questions 19-20");
    expect(formatQuestionRange(19, 2)).toBe("19-20");
    expect(formatQuestionsHeading(11, 16)).toBe("Questions 11-16");
  });

  it("ownQuestionsHeading matches shared / multi-select ranges", () => {
    expect(
      ownQuestionsHeading(
        {
          id: "g1",
          type: "GAPPED_TEXT",
          promptContent: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "blank", attrs: { id: "a" } },
                  { type: "blank", attrs: { id: "b" } },
                ],
              },
            ],
          },
        },
        26,
      ),
    ).toBe("Questions 26-27");
    expect(
      ownQuestionsHeading({ id: "m1", type: "MULTIPLE_SELECT", settings: { selectCount: 2 } }, 9, "IELTS"),
    ).toBe("Questions 9-10");
    expect(
      ownQuestionsHeading({ id: "m1", type: "MULTIPLE_SELECT", settings: { selectCount: 2 } }, 9, "CUSTOM"),
    ).toBeNull();
    expect(
      ownQuestionsHeading(
        {
          id: "match1",
          type: "MATCHING",
          options: { left: [{ id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "3" }, { id: "d", text: "4" }], right: [] },
        },
        23,
        "IELTS",
      ),
    ).toBe("Questions 23-26");
    expect(
      ownQuestionsHeading(
        {
          id: "match1",
          type: "MATCHING",
          options: { left: [{ id: "a", text: "1" }, { id: "b", text: "2" }], right: [] },
        },
        23,
        "CUSTOM",
      ),
    ).toBeNull();
    expect(ownQuestionsHeading({ id: "s1", type: "SINGLE_CHOICE" }, 1)).toBeNull();
  });
});
