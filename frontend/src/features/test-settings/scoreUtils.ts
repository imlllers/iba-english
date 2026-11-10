import type { Question } from "@/entities/question/types";
import { engineOf } from "@/features/question-types/registry";

export function questionMaxScore(question: Question): number {
  const scoring = question.scoringConfig ?? {};
  const engine = engineOf(question.type);
  const num = (key: string) => {
    const value = scoring[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  switch (engine) {
    case "CHOICE":
    case "MULTI_CHOICE":
    case "TEXT_ANSWER":
    case "TRANSFORM":
    case "ORDERING":
      return num("points") ?? 0;
    case "JUDGEMENT": {
      const each = num("pointsPerStatement") ?? 0;
      const count = Array.isArray((question.options as { statements?: unknown[] })?.statements)
        ? (question.options as { statements: unknown[] }).statements.length
        : 0;
      return each * Math.max(count, 1);
    }
    case "INLINE": {
      const each = num("pointsPerBlank") ?? 0;
      const blanks = (question.answerKey as { blanks?: Record<string, unknown> })?.blanks;
      const count = blanks ? Object.keys(blanks).length : 0;
      return each * Math.max(count, 1);
    }
    case "MATCHING": {
      const each = num("pointsPerPair") ?? 0;
      const left = (question.options as { left?: unknown[] })?.left;
      const count = Array.isArray(left) ? left.length : 0;
      return each * Math.max(count, 1);
    }
    case "ERROR_HUNT": {
      const each = num("pointsPerError") ?? 0;
      const errors = (question.answerKey as { errors?: unknown[] })?.errors;
      const count = Array.isArray(errors) ? errors.length : 0;
      return each * Math.max(count, 1);
    }
    case "WRITTEN":
    case "SPEAKING":
      return 0;
    default:
      return num("points") ?? num("maxPoints") ?? 0;
  }
}

export function primaryScoreField(question: Question): { key: string; label: string } | null {
  const engine = engineOf(question.type);
  switch (engine) {
    case "CHOICE":
    case "MULTI_CHOICE":
    case "TEXT_ANSWER":
    case "TRANSFORM":
    case "ORDERING":
      return { key: "points", label: "Баллы" };
    case "JUDGEMENT":
      return { key: "pointsPerStatement", label: "Баллы за пункт" };
    case "INLINE":
      return { key: "pointsPerBlank", label: "Баллы за пропуск" };
    case "MATCHING":
      return { key: "pointsPerPair", label: "Баллы за пару" };
    case "ERROR_HUNT":
      return { key: "pointsPerError", label: "Баллы за ошибку" };
    case "WRITTEN":
    case "SPEAKING":
      return null;
    default:
      return { key: "points", label: "Баллы" };
  }
}
