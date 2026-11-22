import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import { shouldAutoPlayQuestionTaskVideo } from "./questionTaskVideo";

const question = (content: PublicQuestion["settings"]["content"]): PublicQuestion =>
  ({
    id: "q1",
    type: "SPEAKING_RECORDING",
    promptContent: { type: "doc", content: [] },
    options: {},
    settings: { content },
    scoringConfig: { points: 1 },
  }) as unknown as PublicQuestion;

describe("shouldAutoPlayQuestionTaskVideo", () => {
  it("autoplays on a question page with video", () => {
    expect(
      shouldAutoPlayQuestionTaskVideo(false, question([{ id: "v", kind: "video", mediaId: "m" }]), false, true),
    ).toBe(true);
  });

  it("does not autoplay in feed when TOEFL speaking auto flow handles video", () => {
    expect(
      shouldAutoPlayQuestionTaskVideo(false, question([{ id: "v", kind: "video", mediaId: "m" }]), true),
    ).toBe(false);
  });

  it("does not autoplay on group content screen", () => {
    expect(shouldAutoPlayQuestionTaskVideo(true, question([{ id: "v", kind: "video", mediaId: "m" }]))).toBe(false);
  });

  it("does not autoplay without video", () => {
    expect(shouldAutoPlayQuestionTaskVideo(false, question([{ id: "a", kind: "audio", mediaId: "m" }]))).toBe(false);
  });
});