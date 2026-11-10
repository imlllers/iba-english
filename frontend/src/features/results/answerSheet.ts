import type {
  AnswerData,
  InlineOptions,
  Item,
  JudgementOptions,
  MatchingOptions,
  OrderingOptions,
  Question,
  SegmentOptions,
  TextRule,
} from "@/entities/question/types";
import type { AnswerMark } from "@/entities/attempt/types";
import { blankIds } from "@/features/question-types/content";
import { formatQuestionRange } from "@/features/question-types/numbering";
import { engineOf, judgementText } from "@/features/question-types/registry";
import { letter } from "@/shared/lib/format";

export type SheetRow = {
  key: string;
  label: string;
  given: string;
  expected: string;
  mark: AnswerMark;
};

const EMPTY = "–";

function itemsOf(value: unknown): Item[] {
  return Array.isArray(value) ? (value as Item[]) : [];
}

function optionText(list: Item[], id: string): string {
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return id ? EMPTY : "";
  const text = (list[index].text ?? "").trim();
  return text ? `${letter(index)} – ${text}` : letter(index);
}

function accepted(rule: unknown): string {
  if (rule && typeof rule === "object" && "accepted" in rule) {
    return ((rule as TextRule).accepted ?? []).map((item) => String(item).trim()).filter(Boolean).join(" / ");
  }
  return typeof rule === "string" ? rule : "";
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function sheetRows(
  question: Question,
  answer: AnswerData,
  marks: Record<string, AnswerMark> | undefined,
  start: number,
  count: number,
): SheetRow[] {
  if (!marks || Object.keys(marks).length === 0) return [];
  const key = question.answerKey ?? {};
  const options = question.options;
  const markOf = (id: string): AnswerMark => marks[id] ?? "empty";
  const single = (given: string, expected: string): SheetRow[] => [
    { key: "_", label: formatQuestionRange(start, count), given: given || EMPTY, expected: expected || EMPTY, mark: markOf("_") },
  ];

  switch (engineOf(question.type)) {
    case "CHOICE": {
      const list = itemsOf(options);
      return single(optionText(list, text(answer.optionId)), optionText(list, String(key.correctOptionId ?? "")));
    }
    case "MULTI_CHOICE": {
      const list = itemsOf(options);
      const selected = Array.isArray(answer.optionIds) ? (answer.optionIds as string[]) : [];
      const correct = (key.correctOptionIds as string[] | undefined) ?? [];
      const letters = (ids: string[]) => list.map((item, index) => (ids.includes(item.id) ? letter(index) : "")).filter(Boolean).join(", ");
      return single(letters(selected), letters(correct));
    }
    case "JUDGEMENT": {
      const statements = (options as JudgementOptions | undefined)?.statements ?? [];
      const given = (answer.answers as Record<string, string> | undefined) ?? {};
      const expected = (key.answers as Record<string, string> | undefined) ?? {};
      return statements.map((statement, index) => ({
        key: statement.id,
        label: String(start + index),
        given: given[statement.id] ? judgementText(given[statement.id]) : EMPTY,
        expected: expected[statement.id] ? judgementText(expected[statement.id]) : EMPTY,
        mark: markOf(statement.id),
      }));
    }
    case "INLINE": {
      const choices = (options as InlineOptions | undefined)?.choices ?? {};
      const given = (answer.blanks as Record<string, string> | undefined) ?? {};
      const expected = (key.blanks as Record<string, unknown> | undefined) ?? {};
      const show = (blankId: string, value: unknown) => {
        const list = choices[blankId];
        if (list?.length && typeof value === "string") {
          return list.find((item) => item.id === value)?.text?.trim() || value;
        }
        return accepted(value) || text(value);
      };
      return blankIds(question.promptContent).map((blankId, index) => ({
        key: blankId,
        label: String(start + index),
        given: show(blankId, given[blankId]) || EMPTY,
        expected: show(blankId, expected[blankId]) || EMPTY,
        mark: markOf(blankId),
      }));
    }
    case "MATCHING": {
      const matching = options as MatchingOptions | undefined;
      const right = matching?.right ?? [];
      const given = (answer.pairs as Record<string, string> | undefined) ?? {};
      const expected = (key.pairs as Record<string, string> | undefined) ?? {};
      return (matching?.left ?? []).map((item, index) => ({
        key: item.id,
        label: String(start + index),
        given: optionText(right, given[item.id] ?? "") || EMPTY,
        expected: optionText(right, expected[item.id] ?? "") || EMPTY,
        mark: markOf(item.id),
      }));
    }
    case "ORDERING": {
      const ordering = options as OrderingOptions | undefined;
      const all = [...(ordering?.items ?? []), ...(ordering?.distractors ?? [])];
      const sequence = (ids: unknown) =>
        (Array.isArray(ids) ? (ids as string[]) : [])
          .map((id) => all.find((item) => item.id === id)?.text?.trim() || EMPTY)
          .join(" → ");
      return single(sequence(answer.order), sequence(key.order));
    }
    case "ERROR_HUNT": {
      const segments = (options as SegmentOptions | undefined)?.segments ?? [];
      const errors = (key.errors as Record<string, TextRule> | undefined) ?? {};
      const given = (answer.corrections as Record<string, string> | undefined) ?? {};
      const ordered = segments.filter((segment) => errors[segment.id]).map((segment) => segment.id);
      const ids = ordered.length ? ordered : Object.keys(errors);
      return ids.map((errorId, index) => {
        const original = segments.find((segment) => segment.id === errorId)?.text?.trim();
        return {
          key: errorId,
          label: String(start + index),
          given: text(given[errorId]) || EMPTY,
          expected: `${original ? `${original} → ` : ""}${accepted(errors[errorId]) || EMPTY}`,
          mark: markOf(errorId),
        };
      });
    }
    case "TEXT_ANSWER":
    case "TRANSFORM":
      return single(text(answer.text), accepted(key) || text(key.text));
    default:
      return [];
  }
}

export const MARK_LABELS: Record<AnswerMark, string> = {
  correct: "Верно",
  wrong: "Неверно",
  empty: "Нет ответа",
};
