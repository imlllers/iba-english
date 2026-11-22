import { api, json, queryString } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";
import type { PublicTest } from "@/entities/test/types";

export type ColleagueSummary = {
  id: string;
  displayName: string;
  avatar?: string | null;
};

export const shareApi = {
  colleagues: (q: string) => api<Page<ColleagueSummary>>(`/api/teacher/colleagues${queryString({ q, size: 30 })}`),
  share: (testId: string, recipientIds: string[], comment?: string) =>
    api<{ ok: boolean }>(`/api/teacher/tests/${testId}/share`, json("POST", { recipientIds, comment: comment ?? "" })),
  preview: (shareId: string) => api<PublicTest>(`/api/teacher/shares/${shareId}/preview`),
  accept: (shareId: string) => api<{ testId: string }>(`/api/teacher/shares/${shareId}/accept`, json("POST")),
  decline: (shareId: string) => api<{ ok: boolean }>(`/api/teacher/shares/${shareId}/decline`, json("POST")),
};

export function shareMediaUrl(shareId: string, mediaId: string) {
  return `/api/teacher/shares/${shareId}/media/${mediaId}/content`;
}