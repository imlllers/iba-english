import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINES } from "./engines";
import { ANSWER_CATALOG, GROUPS, INLINE_CATALOG, QUESTION_TYPES, TYPE_META, canonicalizeQuestionType, engineOf, judgementLabels, typesOf } from "./registry";

const source = readFileSync(resolve(process.cwd(), "../backend/src/main/java/com/iba/testing/question/QuestionType.java"), "utf8");

const backendTypes = (): Record<string, string> =>
  Object.fromEntries(Array.from(source.matchAll(/^\s{4}([A-Z_]+)\(Engine\.([A-Z_]+)/gm), (match) => [match[1], match[2]]));

describe("question type registry", () => {
  it("matches backend types and engines one to one", () => {
    const backend = backendTypes();
    expect(Object.keys(backend).sort()).toEqual([...QUESTION_TYPES].sort());
    QUESTION_TYPES.forEach((type) => expect(engineOf(type)).toBe(backend[type]));
  });

  it("covers every engine with editor and player", () => {
    QUESTION_TYPES.forEach((type) => {
      const ui = ENGINES[engineOf(type)];
      expect(ui, type).toBeDefined();
      expect(typeof ui.Player).toBe("function");
      expect(typeof ui.Answers).toBe("function");
    });
  });

  it("gives every type a label, hint and known group", () => {
    const groups = new Set(Object.values(TYPE_META).map((meta) => meta.group));
    QUESTION_TYPES.forEach((type) => {
      expect(TYPE_META[type].label.trim()).not.toBe("");
      expect(TYPE_META[type].hint.trim()).not.toBe("");
      expect(groups.has(TYPE_META[type].group)).toBe(true);
    });
  });

  it("lists production types and known groups", () => {
    expect(typesOf("production")).toEqual(["SHORT_WRITTEN", "SPEAKING_RECORDING"]);
    expect(typesOf("grammar")).toEqual(["WORD_TRANSFORM"]);
    expect(typesOf("text")).toEqual(["MATCHING", "ORDER_SENTENCES", "SENTENCE_ERRORS", "TEXT_ERRORS"]);
    expect(GROUPS.map((group) => group.id)).toEqual(["choice", "gaps", "text", "grammar", "production"]);
  });

  it("keeps add-dialog catalogs without exam templates", () => {
    expect(ANSWER_CATALOG).toEqual([
      "SINGLE_CHOICE",
      "MULTIPLE_SELECT",
      "SHORT_ANSWER",
      "SHORT_WRITTEN",
      "TRUE_FALSE",
      "YES_NO",
      "TRUE_FALSE_NOT_GIVEN",
      "YES_NO_NOT_GIVEN",
      "SENTENCE_ERRORS",
      "SENTENCE_GAPS",
      "MATCHING",
      "SPEAKING_RECORDING",
      "ORDER_SENTENCES",
    ]);
    expect(INLINE_CATALOG).toEqual(["GAPPED_TEXT", "TEXT_ERRORS"]);
  });

  it("uses official judgement labels", () => {
    expect(judgementLabels("TRUE_FALSE")).toEqual(["TRUE", "FALSE"]);
    expect(judgementLabels("YES_NO")).toEqual(["YES", "NO"]);
    expect(judgementLabels("YES_NO_NOT_GIVEN")).toEqual(["YES", "NO", "NOT_GIVEN"]);
    expect(judgementLabels("TRUE_FALSE_NOT_GIVEN")).toEqual(["TRUE", "FALSE", "NOT_GIVEN"]);
  });

  it("aliases retired types", () => {
    expect(canonicalizeQuestionType("FILL_BLANKS")).toBe("GAPPED_TEXT");
    expect(canonicalizeQuestionType("HIGHLIGHT_TEXT")).toBe("MATCHING");
    expect(canonicalizeQuestionType("CLASSIFICATION")).toBe("MATCHING");
    expect(canonicalizeQuestionType("FIND_ERRORS")).toBe("TEXT_ERRORS");
    expect(canonicalizeQuestionType("ESSAY")).toBe("SHORT_WRITTEN");
    expect(canonicalizeQuestionType("SENTENCE_TRANSFORM")).toBe("SHORT_ANSWER");
    expect(canonicalizeQuestionType("SENTENCE_GAPS")).toBe("SENTENCE_GAPS");
  });
});
