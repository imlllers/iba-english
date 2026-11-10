import type {
  Item,
  MatchingOptions,
  OrderingOptions,
  Question,
  SegmentOptions,
  TextAnswerKey,
  TextRule,
} from "@/entities/question/types";
import { blankIds, short } from "@/features/question-types/content";
import { engineOf, judgementText } from "@/features/question-types/registry";
import { letter } from "@/shared/lib/format";

export type AnswerKeyLine = { label?: string; value: string };

function itemText(items: Item[] | undefined, id: string) {
  return items?.find((item) => item.id === id)?.text?.trim() || "—";
}

function ruleText(rule: TextRule | undefined) {
  const accepted = rule?.accepted?.filter(Boolean) ?? [];
  return accepted.length ? accepted.join(" / ") : "—";
}

function optionLetters(options: Item[], ids: string[]) {
  return ids
    .map((id) => {
      const index = options.findIndex((option) => option.id === id);
      return index >= 0 ? letter(index) : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function summarizeAnswerKey(question: Question): AnswerKeyLine[] {
  const engine = engineOf(question.type);
  const key = question.answerKey;

  switch (engine) {
    case "CHOICE": {
      const options = Array.isArray(question.options) ? (question.options as Item[]) : [];
      const id = String(key.correctOptionId ?? "");
      const value = id ? optionLetters(options, [id]) || short(itemText(options, id), 60) : "—";
      return [{ value: value || "—" }];
    }
    case "MULTI_CHOICE": {
      const options = Array.isArray(question.options) ? (question.options as Item[]) : [];
      const ids = (key.correctOptionIds as string[]) ?? [];
      return [{ value: ids.length ? optionLetters(options, ids) || "—" : "—" }];
    }
    case "JUDGEMENT": {
      const statements = (question.options as { statements?: Item[] })?.statements ?? [];
      const answers = (key.answers as Record<string, string>) ?? {};
      return statements.map((statement, index) => ({
        label: String(index + 1),
        value: answers[statement.id] ? judgementText(answers[statement.id]) : "—",
      }));
    }
    case "INLINE": {
      const ids = blankIds(question.promptContent);
      const blanks = (key.blanks as Record<string, TextRule | string>) ?? {};
      return ids.map((id, index) => {
        const value = blanks[id];
        if (typeof value === "string") {
          return { label: String(index + 1), value: value.trim() || "—" };
        }
        return { label: String(index + 1), value: ruleText(value) };
      });
    }
    case "TEXT_ANSWER": {
      const answer = key as TextAnswerKey;
      if (answer.mode === "NUMBER") {
        return [{ value: answer.number !== undefined && answer.number !== null ? String(answer.number) : "—" }];
      }
      if (answer.mode === "TIME") {
        return [{ value: answer.time?.trim() || "—" }];
      }
      return [{ value: ruleText(answer) }];
    }
    case "TRANSFORM":
      return [{ value: ruleText(key as TextRule) }];
    case "MATCHING": {
      const options = question.options as MatchingOptions;
      const pairs = (key.pairs as Record<string, string>) ?? {};
      const right = options.right ?? [];
      return (options.left ?? []).map((left, index) => {
        const rightId = pairs[left.id] ?? "";
        const rightIndex = right.findIndex((item) => item.id === rightId);
        return {
          label: String(index + 1),
          value: rightIndex >= 0 ? letter(rightIndex) : "—",
        };
      });
    }
    case "ORDERING": {
      const options = question.options as OrderingOptions;
      const order = (key.order as string[]) ?? [];
      const joiner = options.joiner ?? " · ";
      const texts = order.map((id) => short(itemText(options.items, id), 40));
      return [{ value: texts.filter(Boolean).join(joiner.trim() === "\n" ? " → " : joiner) || "—" }];
    }
    case "ERROR_HUNT": {
      const segments = (question.options as SegmentOptions)?.segments ?? [];
      const errors = (key.errors as Record<string, TextRule>) ?? {};
      return Object.entries(errors).map(([id, rule], index) => ({
        label: String(index + 1),
        value: `${short(itemText(segments, id), 24)} → ${ruleText(rule)}`,
      }));
    }
    case "WRITTEN":
    case "SPEAKING":
      return [{ value: "ручная проверка" }];
    default:
      return [{ value: "—" }];
  }
}
