import { describe, expect, it } from "vitest";
import type { DocNode } from "@/entities/question/types";
import { layoutGapAdjacentInlines } from "./gapAdjacentInlines";

describe("layoutGapAdjacentInlines", () => {
  it("moves a flush $ prefix into the blank group", () => {
    const children: DocNode[] = [
      { type: "text", text: "$" },
      { type: "blank", attrs: { id: "b1" } },
    ];
    const layout = layoutGapAdjacentInlines(children);
    expect(layout.blankAffix[1]).toEqual({ before: "$", after: "" });
    expect(layout.textAt[0]).toBe("");
  });

  it("keeps text before the blank when there is a space", () => {
    const children: DocNode[] = [
      { type: "text", text: "Cost $ " },
      { type: "blank", attrs: { id: "b1" } },
    ];
    const layout = layoutGapAdjacentInlines(children);
    expect(layout.blankAffix[1]).toBeUndefined();
    expect(layout.textAt[0]).toBe("Cost $ ");
  });

  it("keeps a suffix after the blank on the same group", () => {
    const children: DocNode[] = [
      { type: "blank", attrs: { id: "b1" } },
      { type: "text", text: "kg per day" },
    ];
    const layout = layoutGapAdjacentInlines(children);
    expect(layout.blankAffix[0]).toEqual({ before: "", after: "kg" });
    expect(layout.textAt[1]).toBe(" per day");
  });
});