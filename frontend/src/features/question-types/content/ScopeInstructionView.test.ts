import { describe, expect, it } from "vitest";
import { instructionScopeHeading } from "./ScopeInstructionView";

describe("instructionScopeHeading", () => {
  it("shows Directions for TOEIC part instructions", () => {
    expect(instructionScopeHeading("TOEIC", "part")).toBe("Directions");
  });

  it("does not add a heading for other exams or scopes", () => {
    expect(instructionScopeHeading("IELTS", "part")).toBeNull();
    expect(instructionScopeHeading("TOEIC", "section")).toBeNull();
    expect(instructionScopeHeading("TOEIC", "block")).toBeNull();
  });
});