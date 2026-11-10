import { describe, expect, it } from "vitest";
import { isOrderingSlotsMode, isOrderingWords, orderingPresentation } from "./orderingMode";

describe("orderingMode", () => {
  it("uses explicit presentation", () => {
    expect(orderingPresentation({ presentation: "slots" })).toBe("slots");
    expect(orderingPresentation({ presentation: "list", prefix: "The" })).toBe("list");
    expect(isOrderingSlotsMode({ presentation: "list", distractors: [{ id: "x", text: "was" }] })).toBe(false);
  });

  it("falls back to distractors and frame for legacy options", () => {
    expect(orderingPresentation({ items: [] })).toBe("list");
    expect(orderingPresentation({ distractors: [{ id: "d", text: "was" }] })).toBe("slots");
    expect(orderingPresentation({ prefix: "The" })).toBe("slots");
  });

  it("detects words by joiner", () => {
    expect(isOrderingWords({ joiner: " " })).toBe(true);
    expect(isOrderingWords({ joiner: "\n" })).toBe(false);
    expect(isOrderingWords({})).toBe(true);
  });
});
