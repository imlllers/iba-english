import { describe, expect, it } from "vitest";
import { toeflFullWidthQuestionPane, toeflPageInstructionDoc } from "./toeflPageInstruction";

describe("toeflFullWidthQuestionPane", () => {
  it("treats ordering and inline gaps as full-width", () => {
    expect(toeflFullWidthQuestionPane({ type: "ORDER_SENTENCES" })).toBe(true);
    expect(toeflFullWidthQuestionPane({ type: "SENTENCE_GAPS" })).toBe(true);
    expect(toeflFullWidthQuestionPane({ type: "GAPPED_TEXT" })).toBe(true);
    expect(toeflFullWidthQuestionPane({ type: "SINGLE_CHOICE" })).toBe(false);
  });
});

describe("toeflPageInstructionDoc", () => {
  it("elevates plain question instructions on questionPage", () => {
    const doc = toeflPageInstructionDoc({
      question: {
        type: "SINGLE_CHOICE",
        settings: {
          instructions: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Choose the best response" }] }],
          },
        },
      },
      questionPage: true,
    });
    expect(doc?.content?.[0]).toMatchObject({ type: "paragraph" });
  });
});