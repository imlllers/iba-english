import { describe, expect, it } from "vitest";
import { inlineDropdownChoiceItems, SHARED_DROPDOWN_CHOICES_KEY } from "./sharedDropdownChoices";

describe("inlineDropdownChoiceItems", () => {
  it("uses per-blank list by default", () => {
    const items = [{ id: "a", text: "A" }];
    expect(inlineDropdownChoiceItems({ choices: { b1: items } }, "b1")).toBe(items);
  });

  it("uses shared list when enabled", () => {
    const shared = [{ id: "x", text: "X" }];
    const own = [{ id: "y", text: "Y" }];
    expect(inlineDropdownChoiceItems({
      sharedDropdownChoices: true,
      choices: { [SHARED_DROPDOWN_CHOICES_KEY]: shared, b1: own },
    }, "b1")).toBe(shared);
  });
});