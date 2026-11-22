import type { ResultDetail } from "./types";

export const RESULT_DETAIL_LABELS: Record<ResultDetail, string> = {
  score_only: "Итоговый балл",
  sections_only: "Баллы по секциям",
  score_and_scale: "Итоговый балл и баллы по секциям",
};

const RESULT_DETAILS: ResultDetail[] = ["score_only", "sections_only", "score_and_scale"];

export function normalizeResultDetail(raw: unknown): ResultDetail {
  if (raw === "score_and_scale" || raw === "score_review_and_scale") {
    return "score_and_scale";
  }
  if (raw === "sections_only" || raw === "scale_only") {
    return "sections_only";
  }
  return RESULT_DETAILS.includes(raw as ResultDetail) ? (raw as ResultDetail) : "score_only";
}

export function resultShowsScaleSections(detail: ResultDetail): boolean {
  return detail === "score_and_scale" || detail === "sections_only";
}

export function resultShowsOverall(detail: ResultDetail): boolean {
  return detail === "score_only" || detail === "score_and_scale";
}

export function resultShowsScale(detail: ResultDetail): boolean {
  return detail === "score_and_scale";
}

export function effectiveResultDetail(detail: ResultDetail, hasScale: boolean): ResultDetail {
  if (resultShowsScaleSections(detail) && !hasScale) {
    return "score_only";
  }
  return detail;
}

function scaleOption(
  value: Extract<ResultDetail, "sections_only" | "score_and_scale">,
  hasScale: boolean,
): { value: ResultDetail; label: string; disabled?: boolean } {
  const base = RESULT_DETAIL_LABELS[value];
  return hasScale
    ? { value, label: base }
    : { value, label: `${base} – сначала привяжите шкалу`, disabled: true };
}

export function buildResultOptions(hasScale: boolean): { value: ResultDetail; label: string; disabled?: boolean }[] {
  return [
    { value: "score_only", label: RESULT_DETAIL_LABELS.score_only },
    scaleOption("sections_only", hasScale),
    scaleOption("score_and_scale", hasScale),
  ];
}