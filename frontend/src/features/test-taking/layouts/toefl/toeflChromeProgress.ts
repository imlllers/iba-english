import type { PublicSection, QuestionNumberScope } from "@/entities/test/types";
import type { RunnerPage } from "../../runnerPages";

const SECTION_LABELS: Record<string, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

export function toeflSectionChromeLabel(section: Pick<PublicSection, "title" | "sectionType">): string {
  const mapped = SECTION_LABELS[section.sectionType];
  if (mapped) {
    return mapped;
  }
  const title = section.title?.trim();
  if (!title) {
    return "Section";
  }
  return title.replace(/\s+Section$/i, "").trim() || title;
}

export function scopeSlotTotal(
  pages: RunnerPage[],
  current: RunnerPage,
  scope: QuestionNumberScope,
): number {
  return pages
    .filter((page) => pageInNumberScope(page, current, scope))
    .reduce((sum, page) => sum + page.count, 0);
}

function pageInNumberScope(page: RunnerPage, current: RunnerPage, scope: QuestionNumberScope): boolean {
  if (scope === "test") {
    return true;
  }
  if (page.section.id !== current.section.id) {
    return false;
  }
  if (scope === "section") {
    return true;
  }
  const pagePartId = page.part?.id ?? null;
  const currentPartId = current.part?.id ?? null;
  return pagePartId === currentPartId;
}

export function resolveChromeProgressPage(
  pages: RunnerPage[],
  pageIndex: number,
  current: RunnerPage,
  scope: QuestionNumberScope,
): Pick<RunnerPage, "start" | "end" | "count"> {
  if (current.count > 0) {
    return current;
  }
  for (let i = pageIndex; i < pages.length; i += 1) {
    const page = pages[i];
    if (!pageInNumberScope(page, current, scope)) {
      break;
    }
    if (page.count > 0) {
      return page;
    }
  }
  for (let i = pageIndex - 1; i >= 0; i -= 1) {
    const page = pages[i];
    if (!pageInNumberScope(page, current, scope)) {
      break;
    }
    if (page.count > 0) {
      return page;
    }
  }
  return current;
}

export function toeflChromeProgress(
  section: Pick<PublicSection, "title" | "sectionType">,
  page: Pick<RunnerPage, "start" | "end" | "count">,
  totalSlotsInScope: number,
): string {
  const sectionLabel = toeflSectionChromeLabel(section);
  if (page.count <= 0) {
    return sectionLabel;
  }
  const range = page.start === page.end
    ? `Question ${page.start}`
    : `Question ${page.start}-${page.end}`;
  return `${sectionLabel} | ${range} of ${totalSlotsInScope}`;
}