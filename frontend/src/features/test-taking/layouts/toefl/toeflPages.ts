import type { ExamDisplayType, MaterialBlock } from "@/entities/test/types";
import { blockItems, contentItemFilled } from "@/features/question-types/content/contentItems";
import { scopeItems } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { questionSlotCount } from "@/features/question-types/numbering";
import type { RunnerPage } from "../../runnerPages";

export type ToeflPage = RunnerPage & {
  intro?: "section" | "part";
  groupContent?: boolean;
  listenedBlock?: boolean;
  listenedBlockMediaOnly?: boolean;
};

const hasText = (raw: string | null | undefined) => instructionHasContent(toInstructionDoc(raw ?? ""));

type Scope = Parameters<typeof scopeItems>[0];
const hasAudio = (scope: Scope) => scopeItems(scope).some((item) => item.kind === "audio" && item.mediaId);

export const isListening = (page: RunnerPage) => page.section.sectionType === "LISTENING";

export function excludeBlockAudioFromGate(page: ToeflPage): boolean {
  return Boolean(page.listenedBlockMediaOnly);
}

export function blockHasAudio(block: MaterialBlock) {
  return blockItems(block).some((item) => item.kind === "audio" && item.mediaId);
}

export function blockHasSideText(block: MaterialBlock) {
  return blockItems(block).some((item) => item.kind !== "audio" && contentItemFilled(item));
}

export function blockHasVisualMedia(block: MaterialBlock) {
  return blockItems(block).some(
    (item) => (item.kind === "image" || item.kind === "video") && contentItemFilled(item),
  );
}

function questionsOnBlock(page: RunnerPage, blockId: string) {
  return page.questions.filter((question) => (question.materialBlockId ?? page.block?.id ?? null) === blockId);
}

function resolveBlock(page: RunnerPage, blockId: string | null): MaterialBlock | null {
  if (!blockId) {
    return null;
  }
  if (page.block?.id === blockId) {
    return page.block;
  }
  return page.section.materialBlocks?.find((item) => item.id === blockId) ?? null;
}

function introPage(page: RunnerPage, kind: "section" | "part"): ToeflPage {
  const id = kind === "section" ? page.section.id : page.part?.id ?? page.section.id;
  return { ...page, key: `intro-${kind}-${id}`, block: null, questions: [], count: 0, end: page.start - 1, intro: kind };
}

function splitToeflPage(page: RunnerPage, examType: ExamDisplayType): ToeflPage[] {
  if (page.questions.length === 0) {
    return [];
  }
  if (page.questions.length === 1 && !page.block && !page.questions[0].materialBlockId) {
    return [page];
  }

  const result: ToeflPage[] = [];
  const shownAudioGroups = new Set<string>();
  let start = page.start;

  for (const question of page.questions) {
    const blockId = question.materialBlockId ?? page.block?.id ?? null;
    const block = resolveBlock(page, blockId);
    const audioGroup = block != null && blockHasAudio(block);

    const blockQuestionCount = block && audioGroup ? questionsOnBlock(page, block.id).length : 0;
    const singleAudioQuestion = blockQuestionCount === 1;

    if (block && audioGroup && !shownAudioGroups.has(block.id)) {
      shownAudioGroups.add(block.id);
      if (!singleAudioQuestion) {
        result.push({
          ...page,
          key: `${page.key}-group-${block.id}`,
          block,
          questions: [],
          start,
          count: 0,
          end: start - 1,
          groupContent: true,
        });
      }
    }

    const count = questionSlotCount(question, examType);
    result.push({
      ...page,
      key: page.questions.length === 1 && !block ? page.key : `${page.key}-${question.id}`,
      block,
      questions: [question],
      start,
      count,
      end: start + count - 1,
      listenedBlock: Boolean(audioGroup),
      listenedBlockMediaOnly: Boolean(audioGroup && !singleAudioQuestion),
    });
    start += count;
  }
  return result;
}

export function withIntroPages(pages: RunnerPage[], examType: ExamDisplayType): ToeflPage[] {
  const result: ToeflPage[] = [];
  let sectionId = "";
  let partId = "";
  for (const page of pages) {
    if (page.section.id !== sectionId) {
      sectionId = page.section.id;
      partId = "";
      if (hasText(page.section.instructions) || hasAudio(page.section)) {
        result.push(introPage(page, "section"));
      }
    }
    const currentPart = page.part?.id ?? "";
    if (currentPart && currentPart !== partId) {
      partId = currentPart;
      if (page.part && (hasText(page.part.instructions) || hasAudio(page.part))) {
        result.push(introPage(page, "part"));
      }
    }
    result.push(...splitToeflPage(page, examType));
  }
  return result;
}