import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import type { MaterialBlock } from "@/entities/test/types";
import { blockSideContentForQuestion, resolveQuestionVisual } from "./resolveQuestionVisual";

function group(): MaterialBlock {
  return {
    id: "g1",
    title: "Group",
    instructions: "",
    content: { type: "doc", content: [] },
    items: [
      { id: "a1", kind: "audio", mediaId: "audio-1" },
      { id: "i1", kind: "image", mediaId: "group-photo" },
    ],
    orderIndex: 0,
  };
}

function baseQuestion(overrides: Partial<PublicQuestion["settings"]> & { content?: PublicQuestion["settings"]["content"] }): PublicQuestion {
  return {
    id: "q1",
    type: "SPEAKING",
    promptContent: { type: "doc", content: [] },
    options: {},
    settings: { ...overrides },
    scoringConfig: { points: 1 },
    partId: null,
    materialBlockId: "g1",
    required: true,
    orderIndex: 0,
  } as unknown as PublicQuestion;
}

describe("resolveQuestionVisual", () => {
  it("hides group photo when the question has its own video", () => {
    const question = baseQuestion({
      content: [{ id: "v1", kind: "video", mediaId: "q-video" }],
    });
    expect(resolveQuestionVisual(group(), question)).toBe("question");
  });

  it("hides group photo when the question has its own image", () => {
    const question = baseQuestion({
      content: [{ id: "i2", kind: "image", mediaId: "q-image" }],
    });
    expect(resolveQuestionVisual(group(), question)).toBe("question");
  });

  it("keeps group photo when the question has only audio or no media", () => {
    const audioOnly = baseQuestion({
      content: [{ id: "a2", kind: "audio", mediaId: "q-audio" }],
    });
    const empty = baseQuestion({});
    expect(resolveQuestionVisual(group(), audioOnly)).toBe("group");
    expect(resolveQuestionVisual(group(), empty)).toBe("group");
  });

  it("treats image-only group as no side content when question supplies video", () => {
    const photoGroup: MaterialBlock = {
      ...group(),
      items: [{ id: "i1", kind: "image", mediaId: "group-photo" }],
    };
    const question = baseQuestion({
      content: [{ id: "v1", kind: "video", mediaId: "q-video" }],
    });
    expect(blockSideContentForQuestion(photoGroup, question)).toBe(false);
  });
});