import { api, formData, json } from "@/shared/api/client";
import type { AnswerData } from "@/entities/question/types";
import type {
  AnswerCheckResult,
  ParticipantResult,
  ResumedAttempt,
  StartedAttempt,
} from "@/entities/attempt/types";
import type { PublicTest } from "@/entities/test/types";

export const publicApi = {
  test: (publicToken: string) => api<PublicTest>(`/api/public/tests/${publicToken}`),
  start: (publicToken: string, participantName: string, participantEmail: string) =>
    api<StartedAttempt>(`/api/public/tests/${publicToken}/attempts`, json("POST", { participantName, participantEmail })),
  resume: (attemptToken: string) => api<ResumedAttempt>(`/api/public/attempts/${attemptToken}`),
  saveAnswer: (attemptToken: string, questionId: string, answer: AnswerData) =>
    api<{ saved: boolean }>(`/api/public/attempts/${attemptToken}/answers/${questionId}`, json("PUT", answer)),
  checkAnswer: (attemptToken: string, questionId: string, answer: AnswerData) =>
    api<AnswerCheckResult>(
      `/api/public/attempts/${attemptToken}/answers/${questionId}/check`,
      json("POST", answer),
    ),
  startSection: (attemptToken: string, sectionId: string) =>
    api<{ endsAt: string | null; blockEndsAt?: string | null }>(
      `/api/public/attempts/${attemptToken}/sections/${sectionId}/start`,
      json("POST"),
    ),
  startPart: (attemptToken: string, partId: string) =>
    api<{ endsAt: string | null }>(`/api/public/attempts/${attemptToken}/parts/${partId}/start`, json("POST")),
  pausePart: (
    attemptToken: string,
    partId: string,
    body?: { audioKey?: string; durationSeconds?: number },
  ) =>
    api<{ endsAt: string }>(
      `/api/public/attempts/${attemptToken}/parts/${partId}/pause`,
      json("POST", body ?? {}),
    ),
  markReadingStart: (attemptToken: string, questionId: string) =>
    api<{ saved: boolean }>(`/api/public/attempts/${attemptToken}/questions/${questionId}/reading-start`, json("POST")),
  markReadingDone: (attemptToken: string, questionId: string) =>
    api<{ saved: boolean }>(`/api/public/attempts/${attemptToken}/questions/${questionId}/reading-done`, json("POST")),
  resumePart: (attemptToken: string, partId: string) =>
    api<{ endsAt: string }>(`/api/public/attempts/${attemptToken}/parts/${partId}/resume`, json("POST")),
  startQuestion: (attemptToken: string, questionId: string) =>
    api<{ endsAt: string | null }>(`/api/public/attempts/${attemptToken}/questions/${questionId}/start`, json("POST")),
  markAudioDone: (attemptToken: string, key: string) =>
    api<{ saved: boolean }>(`/api/public/attempts/${attemptToken}/audio-done`, json("POST", { key })),
  submit: (attemptToken: string, init?: RequestInit) =>
    api<ParticipantResult>(`/api/public/attempts/${attemptToken}/submit`, { ...json("POST"), ...init }),
  result: (attemptToken: string) => api<ParticipantResult>(`/api/public/attempts/${attemptToken}/result`),
  uploadRecording: (attemptToken: string, file: Blob, name: string) =>
    api<{ id: string }>(`/api/public/attempts/${attemptToken}/media`, formData(file, name)),
};

export function publicMediaUrl(publicToken: string, mediaId: string) {
  return `/api/public/tests/${publicToken}/media/${mediaId}`;
}

export function attemptMediaUrl(attemptToken: string, mediaId: string) {
  return `/api/public/attempts/${attemptToken}/media/${mediaId}`;
}
