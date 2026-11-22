import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import { isAnswered } from "@/features/question-types/QuestionPlayer";

describe("TOEFL listening chrome next", () => {
  const question = {
    id: "q1",
    type: "SINGLE_CHOICE",
    promptContent: { type: "doc", content: [] },
    options: { choices: [{ id: "a", text: "A" }] },
    settings: { timeLimitSeconds: 20 },
    scoringConfig: { points: 1 },
    required: true,
    orderIndex: 0,
  } as PublicQuestion;

  it("treats answered listening question as ready for Next", () => {
    expect(isAnswered(question, { optionId: "a" })).toBe(true);
  });
});