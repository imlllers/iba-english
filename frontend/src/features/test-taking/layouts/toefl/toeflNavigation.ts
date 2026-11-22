import type { TestSettings } from "@/entities/test/types";
import type { RunnerPage } from "../../runnerPages";

function moduleKey(page: RunnerPage | undefined) {
  if (!page) {
    return "";
  }
  return `${page.section.id}:${page.part?.id ?? ""}`;
}

export function canGoToToeflPage(
  pages: RunnerPage[],
  index: number,
  targetIndex: number,
  settings: Partial<TestSettings>,
  listeningLocked: boolean,
): boolean {
  if (targetIndex < 0 || targetIndex >= pages.length) {
    return false;
  }
  if (listeningLocked && targetIndex !== index && targetIndex !== index + 1) {
    return false;
  }
  const target = pages[targetIndex];
  const from = pages[index];
  if (!target || !from) {
    return false;
  }
  if (targetIndex === index + 1) {
    return true;
  }
  if (targetIndex > index) {
    return moduleKey(target) === moduleKey(from);
  }
  const allowBackToSection = settings.allowBackToSection !== false;
  const allowBackToPart = (from.section.allowBackToPart ?? settings.allowBackToPart) !== false;
  const allowBackToQuestions = (from.section.allowBackToQuestions ?? settings.allowBackToQuestions) !== false;
  if (target.section.id !== from.section.id) {
    return allowBackToSection;
  }
  const targetPart = target.part?.id ?? null;
  const fromPart = from.part?.id ?? null;
  if (targetPart !== fromPart) {
    return allowBackToPart;
  }
  return allowBackToQuestions;
}

export function needsToeflForwardConfirm(
  currentIndex: number,
  nextIndex: number,
  pages: RunnerPage[],
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
  if (current.section.id !== next.section.id) {
    return true;
  }
  const currentPart = current.part?.id ?? null;
  const nextPart = next.part?.id ?? null;
  return currentPart !== nextPart;
}

type ToeflAllowChromeNextInput = {
  demoMode: boolean;
  speakingAutoFlow: boolean;
  listeningLocked: boolean;
  intro?: "section" | "part";
  introAudioCount: number;
  groupContent: boolean;
  examAudioOn: boolean;
  earlyNextInGroup: boolean;
  earlyNextListening: boolean;
};

export function toeflAllowChromeNext(input: ToeflAllowChromeNextInput): boolean {
  if (input.demoMode) {
    return true;
  }
  if (input.intro && input.introAudioCount === 0) {
    return true;
  }
  if (input.speakingAutoFlow) {
    return false;
  }
  return !input.listeningLocked
    || Boolean(input.intro && input.introAudioCount === 0)
    || Boolean(input.groupContent && !input.examAudioOn)
    || input.earlyNextInGroup
    || input.earlyNextListening;
}