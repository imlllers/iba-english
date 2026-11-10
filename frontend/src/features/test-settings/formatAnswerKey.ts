import type {
  InlineOptions,
  Item,
  JudgementOptions,
  MatchingOptions,
  Question,
  SegmentOptions,
  TextRule,
} from "@/entities/question/types";
import { blankIds } from "@/features/question-types/content";
import { engineOf, judgementLabels, judgementText } from "@/features/question-types/registry";
import { letter } from "@/shared/lib/format";

export type AnswerKeyLine = {
  number: number;
  text: string;
  incomplete: boolean;
  questionId: string;
};

function itemsOf(value: unknown): Item[] {
  return Array.isArray(value) ? (value as Item[]) : [];
}

function optionLetter(options: Item[], id: string) {
  const index = options.findIndex((item) => item.id === id);
  return index >= 0 ? letter(index) : "";
}

function ruleAccepted(value: unknown): string {
  if (value && typeof value === "object" && "accepted" in value) {
    const accepted = ((value as TextRule).accepted ?? []).map((item) => String(item).trim()).filter(Boolean);
    return accepted.join(" / ");
  }
  return "";
}

function blankAnswer(choices: Record<string, Item[]> | undefined, blankId: string, value: unknown): string {
  const fromRule = ruleAccepted(value);
  if (fromRule) {
    return fromRule;
  }
  if (typeof value === "string" && value.trim()) {
    const option = (choices?.[blankId] ?? []).find((item) => item.id === value);
    return option?.text?.trim() || value.trim();
  }
  return "";
}

function lines(
  questionId: string,
  start: number,
  values: string[],
): AnswerKeyLine[] {
  return values.map((text, index) => ({
    number: start + index,
    text: text || "–",
    incomplete: !text,
    questionId,
  }));
}

export function formatAnswerKeyLines(question: Question, startNumber = 1): AnswerKeyLine[] {
  const key = question.answerKey ?? {};
  const options = question.options;
  const engine = engineOf(question.type);
  const id = question.id;

  try {
    switch (engine) {
      case "CHOICE": {
        const optionId = String(key.correctOptionId ?? "");
        const list = itemsOf(options);
        const mark = optionId ? optionLetter(list, optionId) : "";
        return lines(id, startNumber, [mark]);
      }
      case "MULTI_CHOICE": {
        const ids = (key.correctOptionIds as string[]) ?? [];
        const list = itemsOf(options);
        const marks = list
          .map((item) => (item.id && ids.includes(item.id) ? optionLetter(list, item.id) : ""))
          .filter(Boolean);
        return marks.length ? lines(id, startNumber, marks) : lines(id, startNumber, [""]);
      }
      case "JUDGEMENT": {
        const statements = (options as JudgementOptions | undefined)?.statements ?? [];
        const answers = (key.answers as Record<string, string>) ?? {};
        const allowed = new Set(judgementLabels(question.type));
        if (statements.length === 0) {
          const orphan = Object.values(answers)
            .map((value) => String(value ?? "").trim())
            .filter((value) => allowed.has(value))
            .map(judgementText);
          return orphan.length ? lines(id, startNumber, orphan) : lines(id, startNumber, [""]);
        }
        return lines(
          id,
          startNumber,
          statements.map((statement) => {
            const raw = String(answers[statement.id] ?? "").trim();
            return raw && allowed.has(raw) ? judgementText(raw) : "";
          }),
        );
      }
      case "INLINE": {
        const ids = blankIds(question.promptContent);
        const blanks = (key.blanks as Record<string, unknown>) ?? {};
        const choices = (options as InlineOptions | undefined)?.choices;
        if (ids.length === 0) {
          return lines(id, startNumber, [""]);
        }
        return lines(
          id,
          startNumber,
          ids.map((blankId) => blankAnswer(choices, blankId, blanks[blankId])),
        );
      }
      case "TEXT_ANSWER":
      case "TRANSFORM": {
        const accepted = (key.accepted as string[]) ?? [];
        const text = typeof key.text === "string" ? key.text : "";
        const shown = accepted.length ? accepted.join(" / ") : text.trim();
        return lines(id, startNumber, [shown]);
      }
      case "MATCHING": {
        const matching = options as MatchingOptions | undefined;
        const left = matching?.left ?? [];
        const right = matching?.right ?? [];
        const pairs = (key.pairs as Record<string, string>) ?? (key.answers as Record<string, string>) ?? {};
        if (left.length === 0) {
          return lines(id, startNumber, [""]);
        }
        return lines(
          id,
          startNumber,
          left.map((item) => {
            const rightId = pairs[item.id] ?? "";
            const rightIndex = right.findIndex((entry) => entry.id === rightId);
            return rightIndex >= 0 ? letter(rightIndex) : "";
          }),
        );
      }
      case "ORDERING": {
        const order = (key.order as string[]) ?? [];
        return lines(id, startNumber, [order.length ? `Порядок: ${order.length} эл.` : ""]);
      }
      case "ERROR_HUNT": {
        const segments = (options as SegmentOptions | undefined)?.segments ?? [];
        const errors = (key.errors as Record<string, TextRule>) ?? {};
        const ordered = segments.filter((segment) => errors[segment.id]).map((segment) => segment.id);
        const ids = ordered.length ? ordered : Object.keys(errors);
        const parts = ids.map((errorId) => ruleAccepted(errors[errorId]));
        return parts.length ? lines(id, startNumber, [parts.filter(Boolean).join(", ")]) : lines(id, startNumber, [""]);
      }
      case "WRITTEN":
      case "SPEAKING":
        return [{ number: startNumber, text: "Ручная проверка", incomplete: false, questionId: id }];
      default:
        return lines(id, startNumber, [""]);
    }
  } catch {
    return lines(id, startNumber, [""]);
  }
}

export function formatAnswerKey(
  question: Question,
  startNumber = 1,
): { text: string; incomplete: boolean } {
  const parts = formatAnswerKeyLines(question, startNumber);
  const incomplete = parts.some((part) => part.incomplete);
  const text = parts.map((part) => `${part.number} ${part.text}`).join(" ");
  return { text: incomplete && parts.every((part) => part.incomplete) ? "–" : text, incomplete };
}
