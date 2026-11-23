import type { DocNode } from "@/entities/question/types";

export type GapAdjacentAffix = { before: string; after: string };

export type InlineGapLayout = {
  textAt: Record<number, string>;
  blankAffix: Record<number, GapAdjacentAffix>;
};

export function layoutGapAdjacentInlines(children: DocNode[]): InlineGapLayout {
  const textAt: Record<number, string> = {};
  children.forEach((child, index) => {
    if (child.type === "text") {
      textAt[index] = child.text ?? "";
    }
  });
  const blankAffix: Record<number, GapAdjacentAffix> = {};

  children.forEach((child, index) => {
    if (child.type !== "blank") {
      return;
    }
    let before = "";
    let after = "";
    const prev = children[index - 1];
    if (prev?.type === "text") {
      const source = textAt[index - 1] ?? "";
      const match = source.match(/(\S+)$/);
      if (match) {
        before = match[1];
        textAt[index - 1] = source.slice(0, -before.length);
      }
    }
    const next = children[index + 1];
    if (next?.type === "text") {
      const source = textAt[index + 1] ?? "";
      const match = source.match(/^(\S+)/);
      if (match) {
        after = match[1];
        textAt[index + 1] = source.slice(after.length);
      }
    }
    if (before || after) {
      blankAffix[index] = { before, after };
    }
  });

  return { textAt, blankAffix };
}