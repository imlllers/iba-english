import { api, json, queryString } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";
import type { AttemptDetail, AttemptStatus, AttemptSummary } from "@/entities/attempt/types";

export type ResultsQuery = { q?: string; testId?: string; status?: AttemptStatus | ""; level?: string; page?: number; size?: number };
export type ReviewInput = { awardedScore: number; feedback: string; criterionScores: Record<string, number> | null };

export const resultsApi = {
  list: (query: ResultsQuery) => api<Page<AttemptSummary>>(`/api/teacher/results${queryString(query)}`),
  detail: (attemptId: string) => api<AttemptDetail>(`/api/teacher/attempts/${attemptId}`),
  review: (attemptId: string, questionId: string, input: ReviewInput) =>
    api<AttemptDetail>(`/api/teacher/attempts/${attemptId}/answers/${questionId}/review`, json("PUT", input)),
  scaleScore: (attemptId: string, index: number, score: number | null) =>
    api<AttemptDetail>(`/api/teacher/attempts/${attemptId}/scale/${index}`, json("PUT", { score })),
  sendResult: (attemptId: string) =>
    api<AttemptDetail>(`/api/teacher/attempts/${attemptId}/send-result`, json("POST")),
};

export function recordingUrl(attemptId: string, mediaId: string) {
  return `/api/teacher/attempts/${attemptId}/media/${mediaId}`;
}
