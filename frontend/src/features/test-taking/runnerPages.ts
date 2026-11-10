import type { PublicQuestion } from "@/entities/question/types";
import type {
  ExamDisplayType,
  MaterialBlock,
  PublicSection,
  QuestionNumberScope,
  SectionPart,
} from "@/entities/test/types";
import { questionSlotCount } from "@/features/question-types/numbering";
import { hasParts, orderedQuestions, sectionBlocks, sectionParts } from "@/features/test-builder/sectionParts";

export type RunnerPage = {
  key: string;
  section: PublicSection;
  sectionIndex: number;
  part: SectionPart | null;
  block: MaterialBlock | null;
  questions: PublicQuestion[];
  start: number;
  count: number;
  end: number;
};

export type BuildRunnerPagesOptions = {
  oneQuestionPerPage?: boolean;
  numberScope?: QuestionNumberScope;
  examType?: ExamDisplayType | null;
};

type NumberCursor = {
  value: number;
  lastKey: string;
  scope: QuestionNumberScope;
};

function scopeBoundaryKey(
  scope: QuestionNumberScope,
  section: PublicSection,
  partId: string | null | undefined,
): string {
  if (scope === "test") {
    return "test";
  }
  if (scope === "section") {
    return `section:${section.id}`;
  }
  return partId ? `part:${partId}` : `section:${section.id}`;
}

export function buildRunnerPages(
  sections: PublicSection[],
  options: BuildRunnerPagesOptions = {},
): RunnerPage[] {
  const examType = options.examType ?? "CUSTOM";
  const perPage = options.oneQuestionPerPage !== false;
  const pages: RunnerPage[] = [];
  const cursor: NumberCursor = { value: 1, lastKey: "", scope: options.numberScope ?? "test" };
  sections.forEach((section, sectionIndex) => {
    const parts = sectionParts(section);
    const questions = orderedQuestions(section);
    if (!hasParts(section)) {
      pushQuestions(pages, cursor, section, sectionIndex, null, questions, perPage, examType);
      return;
    }
    for (const part of parts) {
      const partQuestions = questions.filter((question) => question.partId === part.id);
      pushQuestions(pages, cursor, section, sectionIndex, part, partQuestions, part.oneQuestionPerPage ?? perPage, examType);
    }
    const orphans = questions.filter((question) => !question.partId);
    pushQuestions(pages, cursor, section, sectionIndex, null, orphans, perPage, examType, `section-${section.id}-orphans`);
  });
  return pages;
}

function pushQuestions(
  pages: RunnerPage[],
  cursor: NumberCursor,
  section: PublicSection,
  sectionIndex: number,
  part: SectionPart | null,
  questions: PublicQuestion[],
  perPage: boolean,
  examType: ExamDisplayType,
  groupKey?: string,
) {
  if (!perPage) {
    pushPage(pages, cursor, {
      key: groupKey ?? (part ? `part-${part.id}` : `section-${section.id}`),
      section,
      sectionIndex,
      part,
      block: null,
      questions,
    }, examType);
    return;
  }
  const parts = sectionParts(section);
  const blockMap = new Map(sectionBlocks(section).map((block) => [block.id, block]));
  const seenBlocks = new Set<string>();
  for (const question of questions) {
    const blockId = question.materialBlockId ?? null;
    if (blockId) {
      if (seenBlocks.has(blockId)) {
        continue;
      }
      seenBlocks.add(blockId);
      const block = blockMap.get(blockId) ?? null;
      pushPage(pages, cursor, {
        key: `block-${blockId}`,
        section,
        sectionIndex,
        part: parts.find((item) => item.id === (block?.partId ?? question.partId ?? "")) ?? null,
        block,
        questions: questions.filter((item) => item.materialBlockId === blockId),
      }, examType);
      continue;
    }
    pushPage(pages, cursor, {
      key: `question-${question.id}`,
      section,
      sectionIndex,
      part: parts.find((item) => item.id === (question.partId ?? "")) ?? null,
      block: null,
      questions: [question],
    }, examType);
  }
}

function pushPage(
  pages: RunnerPage[],
  cursor: NumberCursor,
  input: Omit<RunnerPage, "start" | "count" | "end"> & { questions: PublicQuestion[] },
  examType?: ExamDisplayType | null,
) {
  if (input.questions.length === 0) {
    return;
  }
  const boundary = scopeBoundaryKey(cursor.scope, input.section, input.part?.id ?? null);
  if (cursor.scope !== "test" && boundary !== cursor.lastKey) {
    cursor.value = 1;
    cursor.lastKey = boundary;
  } else if (!cursor.lastKey) {
    cursor.lastKey = boundary;
  }
  const count = input.questions.reduce((sum, item) => sum + questionSlotCount(item, examType), 0);
  pages.push({
    ...input,
    start: cursor.value,
    count,
    end: cursor.value + count - 1,
  });
  cursor.value += count;
}
