import type { ExamDisplayType } from "@/entities/test/types";
import { scopeItems } from "@/features/question-types/content/contentItems";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { questionSlotCount } from "@/features/question-types/numbering";
import type { RunnerPage } from "../../runnerPages";

export type ToeflPage = RunnerPage & { intro?: "section" | "part"; groupContent?: boolean; listenedBlock?: boolean };

const hasText = (raw: string | null | undefined) => instructionHasContent(toInstructionDoc(raw ?? ""));

type Scope = Parameters<typeof scopeItems>[0];
const hasAudio = (scope: Scope) => scopeItems(scope).some((item) => item.kind === "audio" && item.mediaId);

export const isListening = (page: RunnerPage) => page.section.sectionType === "LISTENING";

function introPage(page: RunnerPage, kind: "section" | "part"): ToeflPage {
  const id = kind === "section" ? page.section.id : page.part?.id ?? page.section.id;
  return { ...page, key: `intro-${kind}-${id}`, block: null, questions: [], count: 0, end: page.start - 1, intro: kind };
}

function splitListening(page: RunnerPage, examType: ExamDisplayType): ToeflPage[] {
  if (!isListening(page)) return [page];
  const result: ToeflPage[] = [];
  const shownGroups = new Set<string>();
  let start = page.start;
  for (const question of page.questions) {
    const blockId = question.materialBlockId ?? null;
    const block = blockId
      ? (page.block?.id === blockId ? page.block : page.section.materialBlocks?.find((item) => item.id === blockId) ?? null)
      : null;
    if (block && !shownGroups.has(block.id)) {
      shownGroups.add(block.id);
      result.push({ ...page, key: `${page.key}-group-${block.id}`, block, questions: [], start, count: 0, end: start - 1, groupContent: true });
    }
    const count = questionSlotCount(question, examType);
    result.push({
      ...page,
      key: page.questions.length === 1 && !block ? page.key : `${page.key}-${question.id}`,
      block: null,
      questions: [question],
      start,
      count,
      end: start + count - 1,
      listenedBlock: Boolean(block),
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
      if (hasText(page.section.instructions) || hasAudio(page.section)) result.push(introPage(page, "section"));
    }
    const currentPart = page.part?.id ?? "";
    if (currentPart && currentPart !== partId) {
      partId = currentPart;
      if (page.part && (hasText(page.part.instructions) || hasAudio(page.part))) result.push(introPage(page, "part"));
    }
    result.push(...splitListening(page, examType));
  }
  return result;
}
