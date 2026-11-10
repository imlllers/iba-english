import { describe, expect, it } from "vitest";
import type { Doc } from "@/entities/question/types";
import { blankIds, docPlainText, linesRule, moveItem, plainToDoc, splitSegments } from "./content";

describe("splitSegments", () => {
  it("splits sentences like the backend", () => {
    expect(splitSegments("  One. Two!  Three? Four  ", "SENTENCE").map((item) => item.text)).toEqual(["One.", "Two!", "Three?", "Four"]);
    expect(splitSegments("One. Two", "SENTENCE").map((item) => item.id)).toEqual(["s0", "s1"]);
  });

  it("splits words on any whitespace", () => {
    expect(splitSegments("She  go\nto school", "WORD")).toEqual([
      { id: "s0", text: "She" },
      { id: "s1", text: "go" },
      { id: "s2", text: "to" },
      { id: "s3", text: "school" },
    ]);
    expect(splitSegments("   ", "WORD")).toEqual([]);
  });
});

describe("blankIds", () => {
  it("returns blanks in document order without duplicates", () => {
    const doc: Doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A " }, { type: "blank", attrs: { id: "b2" } }] },
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "blank", attrs: { id: "b1" } }, { type: "blank", attrs: { id: "b2" } }] }] }] }] },
      ],
    };
    expect(blankIds(doc)).toEqual(["b2", "b1"]);
    expect(blankIds(undefined)).toEqual([]);
  });
});

describe("docPlainText", () => {
  it("joins paragraphs with newlines", () => {
    expect(docPlainText({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "One two" }] },
        { type: "paragraph", content: [{ type: "text", text: "Three" }] },
      ],
    })).toBe("One two\nThree");
    expect(docPlainText(plainToDoc("A\nB"))).toBe("A\nB");
  });
});

describe("helpers", () => {
  it("moves items without mutating", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("parses accepted answers line by line", () => {
    expect(linesRule(" went \n\n has gone ", { accepted: [], caseInsensitive: false })).toEqual({
      accepted: ["went", "has gone"],
      caseInsensitive: false,
      normalizeSpaces: true,
    });
  });
});
