import { describe, expect, it } from "vitest";
import { toeicBlockGroupPreview, toeicMaterialGroupLayout } from "./toeicGroupLayout";
import type { MaterialBlock } from "@/entities/test/types";

describe("toeicMaterialGroupLayout", () => {
  const block: MaterialBlock = {
    id: "b1",
    title: "",
    instructions: "",
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Passage" }] }] },
    orderIndex: 0,
    partId: "p1",
  };

  it("is true for TOEIC with block content or instructions", () => {
    expect(toeicMaterialGroupLayout("TOEIC", block, { questionCount: 2 })).toBe(true);
    expect(toeicMaterialGroupLayout("IELTS", block, { questionCount: 1 })).toBe(false);
  });

  it("preview helper mirrors runner group rule", () => {
    expect(toeicBlockGroupPreview("TOEIC", true, true, [{ id: "t1", kind: "text", doc: block.content! }], false)).toBe(true);
    expect(toeicBlockGroupPreview("TOEIC", true, true, [{ id: "a1", kind: "audio", mediaId: "m1" }], false)).toBe(false);
    expect(toeicBlockGroupPreview("TOEIC", true, false, [], true)).toBe(false);
  });
});