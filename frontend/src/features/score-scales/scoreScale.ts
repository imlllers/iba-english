import type { ConvertMethod, ConvertRow, SectionConvert, ScaleSection, RoundMode, Aggregate, ScoreScale } from "@/entities/scale/types";

import type { ExamDisplayType, SectionType } from "@/entities/test/types";
import { api, json } from "@/shared/api/client";

export type { ConvertMethod, ConvertRow, SectionConvert, ScaleSection, RoundMode, Aggregate, ScoreScale };

export const scoreScalesApi = {
  list: () => api<ScoreScale[]>("/api/teacher/score-scales"),
  save: (scales: ScoreScale[]) => api<ScoreScale[]>("/api/teacher/score-scales", json("PUT", scales)),
};

export const TOTAL_RULES = [
  { value: "sum", label: "Сложить баллы всех секций (как в TOEFL и TOEIC)" },
  { value: "average", label: "Среднее по секциям, округлить до 0.5 (как в IELTS)" },
] as const;

export function withTotalRule(scale: ScoreScale, rule: Aggregate): ScoreScale {
  return rule === "average"
    ? { ...scale, aggregate: "average", round: { step: 0.5, mode: "nearest" } }
    : { ...scale, aggregate: "sum", round: { step: null, mode: "nearest" } };
}

export const SCALE_SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "LISTENING", label: "Listening" },
  { value: "READING", label: "Reading" },
  { value: "WRITING", label: "Writing" },
  { value: "SPEAKING", label: "Speaking" },
  { value: "CUSTOM", label: "Пользовательская" },
];

export function scaleSectionType(section: ScaleSection): SectionType {
  if (section.sectionType) return section.sectionType;
  const byName = section.name.trim().toUpperCase();
  return SCALE_SECTION_TYPES.some((item) => item.value === byName && byName !== "CUSTOM") ? (byName as SectionType) : "CUSTOM";
}

const BUILTIN_EXAM_TYPES: Record<string, ExamDisplayType> = { ielts: "IELTS", toefl: "TOEFL", toeic: "TOEIC" };

export function scaleExamType(scale: ScoreScale): ExamDisplayType {
  return scale.examType ?? BUILTIN_EXAM_TYPES[scale.id] ?? "CUSTOM";
}
export function sectionTypeLabel(type: SectionType): string {
  return SCALE_SECTION_TYPES.find((item) => item.value === type)?.label ?? "Пользовательская";
}

export function convertOf(section: ScaleSection): SectionConvert {
  return section.convert ?? { method: "table", table: [] };
}

export function isManual(section: ScaleSection): boolean {
  return convertOf(section).method === "manual";
}

export function sectionHint(section: ScaleSection): string {
  if (isManual(section)) return "Балл ставит проверяющий";
  const rows = convertOf(section).table ?? [];
  const top = rows.reduce((acc, row) => Math.max(acc, row.to), 0);
  return rows.length ? `По таблице, 0-${formatNumber(top)} правильных` : "По таблице";
}

export function normalizeScale(scale: ScoreScale): ScoreScale {
  return {
    ...scale,
    title: scale.title.trim(),
    sections: scale.sections.map((section) => {
      if (isManual(section)) return section;
      const scores = (convertOf(section).table ?? []).map((row) => row.score);
      if (!scores.length) return section;
      return { ...section, min: Math.min(...scores), max: Math.max(...scores) };
    }),
    levels: [...scale.levels].sort((a, b) => a.min - b.min).map((level) => ({ ...level, label: level.label.trim() })),
  };
}

export function validateScale(scale: ScoreScale): string | null {
  if (!scale.title.trim()) return "Укажите название";
  if (scale.sections.length === 0) return "Добавьте хотя бы одну секцию";
  for (const section of scale.sections) {
    if (!section.name.trim()) return "У каждой секции должно быть название";
    if (isManual(section)) {
      if (section.min > section.max) return `${section.name}: «от» больше «до»`;
      continue;
    }
    const rows = convertOf(section).table ?? [];
    if (!rows.length) return `${section.name}: заполните таблицу`;
    for (const row of rows) {
      if (row.from > row.to) return `${section.name}: в строке «от» больше «до»`;
    }
  }
  for (const level of scale.levels) {
    if (!level.label.trim()) return "У каждого уровня должно быть название";
  }
  return null;
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function newScale(examType: ExamDisplayType = "CUSTOM"): ScoreScale {
  return {
    id: crypto.randomUUID(),
    title: "Новая шкала",
    examType,
    sections: [{ name: "Section 1", min: 0, max: 0, step: 0.5, convert: { method: "table", table: [{ from: 0, to: 0, score: 0 }] } }],
    aggregate: "sum",
    round: { step: null, mode: "nearest" },
    levels: [],
  };
}
