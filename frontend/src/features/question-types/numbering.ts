import type {
  AnswerData,
  Doc,
  JudgementOptions,
  MatchingOptions,
  QuestionType,
} from "@/entities/question/types";
import type {
  ExamDisplayType,
  MaterialBlock,
  QuestionNumberFormat,
  QuestionNumberScope,
  SectionPart,
} from "@/entities/test/types";
import { hasParts, orderedQuestions, sectionParts } from "@/features/test-builder/sectionParts";
import { blankIds } from "./content";
import { ENGINES } from "./engines";
import { engineOf } from "./registry";

export function ieltsMultiSelectSlots(examType?: ExamDisplayType | null) {
  return examType === "IELTS";
}

type WithSlots = {
  id: string;
  type: QuestionType;
  options?: unknown;
  promptContent?: Doc;
  answerKey?: {
    correctOptionIds?: string[];
    errors?: Record<string, unknown>;
  };
  scoringConfig?: { points?: number };
  settings?: { selectCount?: number };
  partId?: string | null;
};

type ScopeSection<T extends WithSlots> = {
  id: string;
  parts?: SectionPart[];
  questions: T[];
  materialBlocks?: MaterialBlock[];
};

function isGapEngine(engine: string) {
  return engine === "INLINE";
}

function statementCount(question: WithSlots): number {
  const engine = engineOf(question.type);
  if (engine === "JUDGEMENT") {
    return (question.options as JudgementOptions | undefined)?.statements?.length ?? 0;
  }
  if (engine === "MATCHING") {
    return (question.options as MatchingOptions | undefined)?.left?.length ?? 0;
  }
  return 0;
}

function multiSelectSlots(question: WithSlots, examType?: ExamDisplayType | null): number {
  if (!ieltsMultiSelectSlots(examType)) {
    return 1;
  }
  const fromKey = question.answerKey?.correctOptionIds?.length;
  if (fromKey && fromKey > 0) {
    return fromKey;
  }
  const fromSettings = Number(question.settings?.selectCount);
  if (Number.isFinite(fromSettings) && fromSettings > 0) {
    return Math.round(fromSettings);
  }
  const points = Number(question.scoringConfig?.points);
  if (Number.isFinite(points) && points > 1) {
    return Math.round(points);
  }
  return 1;
}

function errorSlotIds(question: WithSlots): string[] {
  const errors = question.answerKey?.errors;
  if (!errors) {
    return [];
  }
  return Object.keys(errors);
}

export function questionSlotCount(question: WithSlots, examType?: ExamDisplayType | null): number {
  const engine = engineOf(question.type);
  if (isGapEngine(engine)) {
    return Math.max(1, blankIds(question.promptContent).length);
  }
  if (engine === "ERROR_HUNT") {
    return Math.max(1, errorSlotIds(question).length);
  }
  if (engine === "JUDGEMENT") {
    return Math.max(1, statementCount(question));
  }
  if (engine === "MATCHING") {
    return Math.max(1, statementCount(question));
  }
  if (engine === "MULTI_CHOICE") {
    return multiSelectSlots(question, examType);
  }
  return 1;
}

export function formatQuestionsHeading(start: number, end: number): string {
  return start === end ? `Questions ${start}` : `Questions ${start}-${end}`;
}

export function ownQuestionsHeading(
  question: WithSlots,
  startNumber: number,
  examType?: ExamDisplayType | null,
): string | null {
  const count = questionSlotCount(question, examType);
  if (count < 1) {
    return null;
  }
  if (question.type === "GAPPED_TEXT" || question.type === "TEXT_ERRORS") {
    return formatQuestionsHeading(startNumber, startNumber + count - 1);
  }
  if (question.type === "MULTIPLE_SELECT" && count > 1) {
    return formatQuestionsHeading(startNumber, startNumber + count - 1);
  }
  if (question.type === "MATCHING" && examType === "IELTS") {
    return formatQuestionsHeading(startNumber, startNumber + count - 1);
  }
  return null;
}

export type NumberedQuestion<T extends WithSlots> = {
  question: T;
  start: number;
  count: number;
  end: number;
};

export function numberQuestions<T extends WithSlots>(
  questions: T[],
  examType?: ExamDisplayType | null,
): NumberedQuestion<T>[] {
  let next = 1;
  return questions.map((question) => {
    const count = questionSlotCount(question, examType);
    const start = next;
    next += count;
    return { question, start, count, end: start + count - 1 };
  });
}

export function questionNumberGroups<T extends WithSlots>(
  sections: ScopeSection<T>[],
  scope: QuestionNumberScope = "test",
): T[][] {
  if (scope === "test") {
    return [sections.flatMap((section) => orderedQuestions(section))];
  }
  if (scope === "section") {
    return sections.map((section) => orderedQuestions(section));
  }
  const groups: T[][] = [];
  for (const section of sections) {
    if (!hasParts(section)) {
      groups.push(orderedQuestions(section));
      continue;
    }
    for (const part of sectionParts(section)) {
      groups.push(orderedQuestions(section).filter((question) => question.partId === part.id));
    }
    const orphans = orderedQuestions(section).filter((question) => !question.partId);
    if (orphans.length) {
      groups.push(orphans);
    }
  }
  return groups;
}

export function numberQuestionsByScope<T extends WithSlots>(
  sections: ScopeSection<T>[],
  scope: QuestionNumberScope = "test",
  examType?: ExamDisplayType | null,
): Map<string, { start: number; count: number; end: number }> {
  const map = new Map<string, { start: number; count: number; end: number }>();
  for (const group of questionNumberGroups(sections, scope)) {
    for (const entry of numberQuestions(group, examType)) {
      map.set(entry.question.id, { start: entry.start, count: entry.count, end: entry.end });
    }
  }
  return map;
}

export function numberQuestionsInTest<T extends WithSlots>(
  sections: ScopeSection<T>[],
  scope: QuestionNumberScope = "test",
  examType?: ExamDisplayType | null,
): NumberedQuestion<T>[] {
  const map = numberQuestionsByScope(sections, scope, examType);
  return sections.flatMap((section) => orderedQuestions(section)).map((question) => {
    const entry = map.get(question.id) ?? { start: 1, count: questionSlotCount(question, examType), end: 1 };
    return { question, start: entry.start, count: entry.count, end: entry.end };
  });
}

export function totalSlots(questions: WithSlots[], examType?: ExamDisplayType | null): number {
  return questions.reduce((sum, question) => sum + questionSlotCount(question, examType), 0);
}

export function formatQuestionNumber(n: number, format: QuestionNumberFormat = "1"): string {
  switch (format) {
    case "1.":
      return `${n}.`;
    case "1)":
      return `${n})`;
    case "(1)":
      return `(${n})`;
    case "Q1":
      return `Q${n}`;
    case "Question 1":
      return `Question ${n}`;
    default:
      return String(n);
  }
}

export function formatQuestionRange(
  start: number,
  count: number,
  format: QuestionNumberFormat = "1",
): string {
  if (count <= 1) {
    return formatQuestionNumber(start, format);
  }
  const end = start + count - 1;
  switch (format) {
    case "1.":
      return `${start}.-${end}.`;
    case "1)":
      return `${start})-${end})`;
    case "(1)":
      return `(${start})-(${end})`;
    case "Q1":
      return `Q${start}-Q${end}`;
    case "Question 1":
      return `Question ${start}-${end}`;
    default:
      return `${start}-${end}`;
  }
}

export function isSlotAnswered(question: WithSlots, answer: AnswerData | undefined, slotIndex: number): boolean {
  const engine = engineOf(question.type);
  if (isGapEngine(engine)) {
    const id = blankIds(question.promptContent)[slotIndex];
    if (!id) {
      return false;
    }
    const value = (answer?.blanks as Record<string, string> | undefined)?.[id];
    return Boolean(value?.trim());
  }
  if (engine === "ERROR_HUNT") {
    const id = errorSlotIds(question)[slotIndex];
    if (!id) {
      return false;
    }
    const value = (answer?.corrections as Record<string, string> | undefined)?.[id];
    return value != null && Boolean(value.trim());
  }
  if (engine === "JUDGEMENT") {
    const statement = (question.options as JudgementOptions | undefined)?.statements?.[slotIndex];
    if (!statement) {
      return false;
    }
    return Boolean((answer?.answers as Record<string, string> | undefined)?.[statement.id]);
  }
  if (engine === "MATCHING") {
    const left = (question.options as MatchingOptions | undefined)?.left?.[slotIndex];
    if (!left) {
      return false;
    }
    return Boolean((answer?.pairs as Record<string, string> | undefined)?.[left.id]);
  }
  if (engine === "MULTI_CHOICE") {
    const selected = (answer?.optionIds as string[] | undefined) ?? [];
    return selected.length > slotIndex;
  }
  return Boolean(answer) && ENGINES[engine].answered(answer ?? {});
}
