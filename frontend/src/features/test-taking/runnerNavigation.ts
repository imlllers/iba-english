import type { PublicTestSettings } from "@/entities/test/types";
import type { RunnerPage } from "./runnerPages";

export function willBlockReturn(
  nextPage: RunnerPage,
  previousPage: RunnerPage,
  settings: PublicTestSettings,
): boolean {
  const allowBackToSection = settings.allowBackToSection !== false;
  const fromSection = nextPage.section;
  const allowBackToPart = (fromSection.allowBackToPart ?? settings.allowBackToPart) !== false;
  const allowBackToQuestions = (fromSection.allowBackToQuestions ?? settings.allowBackToQuestions) !== false;

  if (previousPage.section.id !== nextPage.section.id) {
    return !allowBackToSection;
  }
  const previousPart = previousPage.part?.id ?? null;
  const nextPart = nextPage.part?.id ?? null;
  if (previousPart !== nextPart) {
    return !allowBackToPart;
  }
  return !allowBackToQuestions;
}

export function needsForwardConfirm(
  currentIndex: number,
  nextIndex: number,
  pages: RunnerPage[],
  settings: PublicTestSettings,
  demoMode: boolean,
): boolean {
  if (demoMode || nextIndex <= currentIndex || nextIndex >= pages.length) {
    return false;
  }
  const next = pages[nextIndex];
  const current = pages[currentIndex];
  if (!next || !current) {
    return false;
  }
  return willBlockReturn(next, current, settings);
}