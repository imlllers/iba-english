import { describe, expect, it } from "vitest";
import type { RunnerPage } from "../../runnerPages";
import { resolveChromeProgressPage, scopeSlotTotal, toeflChromeProgress, toeflSectionChromeLabel } from "./toeflChromeProgress";

function page(
  partId: string | null,
  start: number,
  count: number,
  sectionId = "s1",
): RunnerPage {
  return {
    key: "k",
    section: { id: sectionId, title: "Listening", sectionType: "LISTENING" } as RunnerPage["section"],
    sectionIndex: 0,
    part: partId ? { id: partId, title: "Part", instructions: "", orderIndex: 0 } : null,
    block: null,
    questions: [],
    start,
    count,
    end: start + count - 1,
  };
}

describe("toeflChromeProgress", () => {
  const section = { title: "Listening Section", sectionType: "LISTENING" as const };

  it("maps section type to short English label", () => {
    expect(toeflSectionChromeLabel(section)).toBe("Listening");
  });

  it("formats single slot", () => {
    expect(toeflChromeProgress(section, { start: 26, end: 26, count: 1 }, 30)).toBe(
      "Listening | Question 26 of 30",
    );
  });

  it("formats slot range on one page", () => {
    expect(toeflChromeProgress(section, { start: 1, end: 10, count: 10 }, 30)).toBe(
      "Listening | Question 1-10 of 30",
    );
  });

  it("shows section only when page has no question slots and none in scope", () => {
    expect(toeflChromeProgress(section, { start: 5, end: 4, count: 0 }, 30)).toBe("Listening");
  });

  it("uses next in-scope question page when current has no slots", () => {
    const pages = [page("p1", 1, 0), page("p1", 1, 1), page("p1", 2, 1)];
    const current = { ...pages[0], count: 0, end: 0 };
    const resolved = resolveChromeProgressPage(pages, 0, current, "part");
    expect(toeflChromeProgress(section, resolved, 2)).toBe("Listening | Question 1 of 2");
  });

  it("counts slots in current part only", () => {
    const pages = [
      page("p1", 1, 10),
      page("p1", 11, 5),
      page("p2", 1, 8),
    ];
    const current = pages[1];
    expect(scopeSlotTotal(pages, current, "part")).toBe(15);
    expect(toeflChromeProgress(section, current, 15)).toBe("Listening | Question 11-15 of 15");
    expect(scopeSlotTotal(pages, pages[2], "part")).toBe(8);
  });
});