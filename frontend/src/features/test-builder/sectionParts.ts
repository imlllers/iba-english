import type { MaterialBlock, Section, SectionPart } from "@/entities/test/types";

type WithParts = { parts?: SectionPart[] };
type WithBlocks = { materialBlocks?: MaterialBlock[] };
type WithQuestions<T> = WithParts & WithBlocks & { questions: T[] };
type WithPartId = { partId?: string | null };
type WithBlockId = { materialBlockId?: string | null };

export function sectionParts(section: WithParts | undefined): SectionPart[] {
  return section?.parts ?? [];
}

export function sectionBlocks(section: WithBlocks | undefined): MaterialBlock[] {
  return section?.materialBlocks ?? [];
}

export function blocksOfPart(section: WithBlocks | undefined, partId: string | null | undefined) {
  const list = sectionBlocks(section);
  if (!partId) {
    return list.filter((block) => !block.partId);
  }
  return list.filter((block) => block.partId === partId);
}

export function questionsOfBlock<T extends WithPartId & WithBlockId>(section: WithQuestions<T>, blockId: string) {
  return orderedQuestions(section).filter((question) => question.materialBlockId === blockId);
}

export type OutlineItem<T extends WithPartId & WithBlockId = WithPartId & WithBlockId> =
  | { kind: "block"; block: MaterialBlock }
  | { kind: "question"; question: T };

export function outlineOfScope<T extends WithPartId & WithBlockId>(
  section: WithQuestions<T>,
  partId: string | null,
): OutlineItem<T>[] {
  const questions = partId
    ? orderedQuestions(section).filter((question) => question.partId === partId)
    : hasParts(section)
      ? orderedQuestions(section).filter((question) => !question.partId)
      : orderedQuestions(section);
  const blocks = blocksOfPart(section, partId);
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const seen = new Set<string>();
  const items: OutlineItem<T>[] = [];

  for (const question of questions) {
    const blockId = question.materialBlockId;
    if (blockId && blockMap.has(blockId)) {
      if (!seen.has(blockId)) {
        seen.add(blockId);
        items.push({ kind: "block", block: blockMap.get(blockId)! });
      }
      continue;
    }
    if (!blockId) {
      items.push({ kind: "question", question });
    }
  }

  for (const block of blocks) {
    if (!seen.has(block.id)) {
      items.push({ kind: "block", block });
    }
  }
  return items;
}

export function findBlock(section: Section | undefined, blockId: string | undefined) {
  if (!section || !blockId) {
    return undefined;
  }
  return sectionBlocks(section).find((block) => block.id === blockId);
}

export function hasParts(section: WithParts | undefined) {
  return sectionParts(section).length > 0;
}

export function questionsOfPart<T extends WithPartId>(section: WithQuestions<T>, partId: string) {
  return section.questions.filter((question) => question.partId === partId);
}

export function orderedQuestions<T extends WithPartId>(section: WithQuestions<T>): T[] {
  const parts = sectionParts(section);
  if (!parts.length) {
    return section.questions;
  }
  const grouped = new Map(parts.map((part) => [part.id, [] as T[]]));
  const rest: T[] = [];
  for (const question of section.questions) {
    const bucket = question.partId ? grouped.get(question.partId) : undefined;
    if (bucket) {
      bucket.push(question);
    } else {
      rest.push(question);
    }
  }
  return [...parts.flatMap((part) => grouped.get(part.id) ?? []), ...rest];
}

export function findPart(section: Section | undefined, partId: string | undefined) {
  if (!section || !partId) {
    return undefined;
  }
  return sectionParts(section).find((part) => part.id === partId);
}
