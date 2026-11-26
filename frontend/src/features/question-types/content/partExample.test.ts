import { describe, expect, it } from "vitest";
import { partExampleFilled } from "./partExample";
import type { PartExample } from "@/entities/test/types";

describe("partExampleFilled", () => {
  it("is false when absent or empty", () => {
    expect(partExampleFilled(null)).toBe(false);
    expect(partExampleFilled(undefined)).toBe(false);
    expect(partExampleFilled({ blocks: [] })).toBe(false);
  });

  it("is true when a text block has content", () => {
    const example: PartExample = {
      blocks: [
        {
          id: "b1",
          kind: "text",
          doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] },
        },
      ],
    };
    expect(partExampleFilled(example)).toBe(true);
  });

  it("is true when choices have text", () => {
    const example: PartExample = {
      blocks: [
        {
          id: "c1",
          kind: "choices",
          correctId: "o1",
          options: [{ id: "o1", text: "Yes" }, { id: "o2", text: "" }],
        },
      ],
    };
    expect(partExampleFilled(example)).toBe(true);
  });
});