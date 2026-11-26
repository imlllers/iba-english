import type { ContentItem } from "@/entities/question/types";
import type { PartExample, PublicSection, SectionPart } from "@/entities/test/types";
import { scopeItems } from "@/features/question-types/content/contentItems";
import type { RunnerPage } from "./runnerPages";

export type IntroAudio = { key: string; mediaId: string };

export function isToeicListening(examType: string | null | undefined, sectionType: string | undefined) {
  return examType === "TOEIC" && sectionType === "LISTENING";
}

export function scopeIntroAudios(
  section: PublicSection,
  part: SectionPart | null,
  example?: PartExample | null,
): IntroAudio[] {
  const queue: IntroAudio[] = [];
  for (const item of scopeItems(section)) {
    if (item.kind === "audio" && item.mediaId) {
      queue.push({ key: `intro:section:${item.id}`, mediaId: item.mediaId });
    }
  }
  if (part) {
    for (const item of scopeItems(part)) {
      if (item.kind === "audio" && item.mediaId) {
        queue.push({ key: `intro:part:${item.id}`, mediaId: item.mediaId });
      }
    }
    for (const block of example?.blocks ?? []) {
      if (block.kind === "audio" && block.mediaId) {
        queue.push({ key: `intro:example:${block.id}`, mediaId: block.mediaId });
      }
    }
  }
  return queue;
}

export function questionAnswerSeconds(question: RunnerPage["questions"][number]): number {
  const seconds = question.settings?.timeLimitSeconds;
  return typeof seconds === "number" && seconds > 0 ? seconds : 0;
}

export function screenAnswerSeconds(page: RunnerPage): number {
  let max = 0;
  for (const question of page.questions) {
    max = Math.max(max, questionAnswerSeconds(question));
  }
  return max;
}

export function screenHasTimedQuestions(page: RunnerPage): boolean {
  return page.questions.some((question) => questionAnswerSeconds(question) > 0);
}

export function questionHasAudio(question: RunnerPage["questions"][number]): boolean {
  return question.settings?.content?.some((item: ContentItem) => item.kind === "audio" && item.mediaId) === true
    || Boolean(question.settings?.mediaId && question.settings?.mediaKind === "audio");
}

export function blockHasAudio(block: RunnerPage["block"]): boolean {
  if (!block) {
    return false;
  }
  const items = block.items ?? [];
  if (items.some((item) => item.kind === "audio" && item.mediaId)) {
    return true;
  }
  return block.mediaKind === "audio" && Boolean(block.mediaId);
}

export function pageHasExamAudio(page: RunnerPage): boolean {
  if (page.questions.length === 1 && !page.block) {
    return questionHasAudio(page.questions[0]);
  }
  if (page.block) {
    return blockHasAudio(page.block);
  }
  return page.questions.some(questionHasAudio);
}