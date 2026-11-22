import { afterEach, describe, expect, it } from "vitest";
import { examSurfaceRoot, isEditableElement, shouldBlockExamClipboard } from "./examCopyGuardPolicy";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("examCopyGuard", () => {
  it("detects exam surface roots", () => {
    document.body.innerHTML = '<div data-runner-layout="ielts"><p id="t">Text</p></div>';
    const node = document.getElementById("t")!;
    expect(examSurfaceRoot(node)?.getAttribute("data-runner-layout")).toBe("ielts");
  });

  it("treats inputs as editable", () => {
    document.body.innerHTML = '<div><input id="i" /></div>';
    expect(isEditableElement(document.getElementById("i"))).toBe(true);
  });

  it("blocks clipboard when selection is inside protected runner text", () => {
    document.body.innerHTML = '<div data-runner-layout="toefl"><div class="iba-test-copy"><p id="p">Passage</p></div></div>';
    const surface = document.querySelector("[data-runner-layout]") as HTMLElement;
    const text = document.getElementById("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.textContent!.length);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(shouldBlockExamClipboard(surface)).toBe(true);
  });

  it("exports React guard component", async () => {
    const guard = await import("./PreventExamCopy");
    expect(typeof guard.PreventExamCopy).toBe("function");
  });

  it("allows clipboard when selection is in an answer field", () => {
    document.body.innerHTML = '<div data-runner-layout="ielts"><textarea id="a">My answer</textarea></div>';
    const surface = document.querySelector("[data-runner-layout]") as HTMLElement;
    const area = document.getElementById("a") as HTMLTextAreaElement;
    area.focus();
    area.setSelectionRange(0, area.value.length);
    expect(shouldBlockExamClipboard(surface)).toBe(false);
  });
});