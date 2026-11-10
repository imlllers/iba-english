import type { AnswerData } from "@/entities/question/types";
import type { ExamDisplayType } from "@/entities/test/types";
import { isSlotAnswered, questionSlotCount } from "@/features/question-types/numbering";
import type { RunnerPage } from "./runnerPages";

export type NavUnit = {
  key: string;
  start: number;
  end: number;
  total: number;
  answered: number;
};

export function navUnits(page: RunnerPage, answers: Record<string, AnswerData>, examType: ExamDisplayType): NavUnit[] {
  const units: (NavUnit & { blockId: string | null })[] = [];
  let cursor = page.start;
  for (const question of page.questions) {
    const slots = questionSlotCount(question, examType);
    let answered = 0;
    for (let offset = 0; offset < slots; offset += 1) {
      if (isSlotAnswered(question, answers[question.id], offset)) answered += 1;
    }
    const blockId = question.materialBlockId ?? null;
    const last = units[units.length - 1];
    if (last && blockId && last.blockId === blockId) {
      last.end += slots;
      last.total += slots;
      last.answered += answered;
    } else {
      units.push({ key: `${page.key}-${cursor}`, blockId, start: cursor, end: cursor + slots - 1, total: slots, answered });
    }
    cursor += slots;
  }
  return units.map(({ blockId: _blockId, ...unit }) => unit);
}
