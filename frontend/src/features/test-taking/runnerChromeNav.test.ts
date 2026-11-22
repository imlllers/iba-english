import { describe, expect, it } from "vitest";
import { showRunnerForward } from "./runnerChromeNav";

describe("showRunnerForward", () => {
  const canAlways = () => true;

  it("shows forward on the last page in a real attempt", () => {
    expect(showRunnerForward(4, 5, canAlways)).toBe(true);
  });

  it("hides finish on the last page in demo preview", () => {
    expect(showRunnerForward(4, 5, canAlways, true, true)).toBe(false);
  });
});