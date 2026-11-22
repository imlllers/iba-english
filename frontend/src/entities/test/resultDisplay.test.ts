import { describe, expect, it } from "vitest";
import {
  buildResultOptions,
  normalizeResultDetail,
  resultShowsOverall,
  resultShowsScale,
  resultShowsScaleSections,
} from "./resultDisplay";

describe("resultDisplay", () => {
  it("recognizes scale sections mode", () => {
    expect(resultShowsScaleSections("score_and_scale")).toBe(true);
    expect(resultShowsScaleSections("sections_only")).toBe(true);
    expect(resultShowsScaleSections("score_only")).toBe(false);
    expect(resultShowsScale("score_and_scale")).toBe(true);
    expect(resultShowsScale("sections_only")).toBe(false);
  });

  it("recognizes overall mode", () => {
    expect(resultShowsOverall("score_only")).toBe(true);
    expect(resultShowsOverall("score_and_scale")).toBe(true);
    expect(resultShowsOverall("sections_only")).toBe(false);
  });

  it("builds three select options", () => {
    const withScale = buildResultOptions(true);
    expect(withScale.map((item) => item.value)).toEqual(["score_only", "sections_only", "score_and_scale"]);
    const withoutScale = buildResultOptions(false);
    expect(withoutScale.filter((item) => item.disabled).map((item) => item.value)).toEqual([
      "sections_only",
      "score_and_scale",
    ]);
  });

  it("maps legacy detail values", () => {
    expect(normalizeResultDetail("score_review_and_scale")).toBe("score_and_scale");
    expect(normalizeResultDetail("score_and_review")).toBe("score_only");
    expect(normalizeResultDetail("sections_only")).toBe("sections_only");
  });
});