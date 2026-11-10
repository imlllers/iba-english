import { api, json, queryString } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";
import type { ContentItem, Doc, Question, QuestionType } from "@/entities/question/types";
import type { AccessStatus, ExamTest, Preset, PublicTest, SectionType, TestSettings, TestSummary } from "@/entities/test/types";

const base = "/api/teacher/tests";

export type TestListQuery = {
  q?: string;
  status?: AccessStatus | "";
  examPreset?: string;
  page?: number;
  size?: number;
};
export type TestMetaInput = { title: string; description: string; settings: TestSettings };
export type SectionInput = {
  title: string;
  instructions: string;
  sectionType: SectionType;
  timeLimitMinutes: number | null;
  allowBackToQuestions?: boolean | null;
  allowBackToPart?: boolean | null;
  items?: ContentItem[];
};
export type PartInput = {
  title: string;
  instructions: string;
  timeLimitMinutes?: number | null;
  oneQuestionPerPage?: boolean | null;
  items?: ContentItem[];
};
export type MaterialBlockInput = {
  title?: string;
  instructions?: string;
  content?: Doc;
  items?: ContentItem[];
  mediaId?: string | null;
  mediaKind?: "image" | "audio" | null;
};

export const testsApi = {
  presets: () => api<Preset[]>("/api/teacher/presets"),
  list: (query: TestListQuery) => api<Page<TestSummary>>(`${base}${queryString(query)}`),
  get: (id: string) => api<ExamTest>(`${base}/${id}`),
  create: (input: { title: string; description: string; examPreset?: string | null; templateId?: string | null }) =>
    api<ExamTest>(base, json("POST", input)),
  update: (id: string, input: TestMetaInput) => api<ExamTest>(`${base}/${id}`, json("PUT", input)),
  publish: (id: string) => api<ExamTest>(`${base}/${id}/publish`, json("POST")),
  duplicate: (id: string) => api<ExamTest>(`${base}/${id}/duplicate`, json("POST")),
  remove: (id: string) => api<void>(`${base}/${id}`, json("DELETE")),
  preview: (id: string) => api<PublicTest>(`${base}/${id}/preview`),
  revokeLink: (id: string) => api<ExamTest>(`${base}/${id}/link/revoke`, json("POST")),
  rotateLink: (id: string) => api<ExamTest>(`${base}/${id}/link/rotate`, json("POST")),
  addSection: (id: string, input: SectionInput) => api<ExamTest>(`${base}/${id}/sections`, json("POST", input)),
  updateSection: (id: string, sectionId: string, input: SectionInput) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}`, json("PUT", input)),
  deleteSection: (id: string, sectionId: string) => api<ExamTest>(`${base}/${id}/sections/${sectionId}`, json("DELETE")),
  addPart: (id: string, sectionId: string) => api<ExamTest>(`${base}/${id}/sections/${sectionId}/parts`, json("POST")),
  updatePart: (id: string, sectionId: string, partId: string, input: PartInput) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/parts/${partId}`, json("PUT", input)),
  deletePart: (id: string, sectionId: string, partId: string) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/parts/${partId}`, json("DELETE")),
  addMaterialBlock: (id: string, sectionId: string, partId: string | null = null) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/material-blocks`, json("POST", { partId })),
  updateMaterialBlock: (id: string, sectionId: string, blockId: string, input: MaterialBlockInput) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/material-blocks/${blockId}`, json("PUT", input)),
  deleteMaterialBlock: (id: string, sectionId: string, blockId: string) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/material-blocks/${blockId}`, json("DELETE")),
  addQuestion: (
    id: string,
    sectionId: string,
    type: QuestionType,
    count = 1,
    partId: string | null = null,
    materialBlockId: string | null = null,
  ) => api<ExamTest>(`${base}/${id}/sections/${sectionId}/questions`, json("POST", { type, count, partId, materialBlockId })),
  updateQuestion: (id: string, question: Question) => api<ExamTest>(`${base}/${id}/questions/${question.id}`, json("PUT", question)),
  duplicateQuestion: (id: string, questionId: string) => api<ExamTest>(`${base}/${id}/questions/${questionId}/duplicate`, json("POST")),
  deleteQuestion: (id: string, questionId: string) => api<ExamTest>(`${base}/${id}/questions/${questionId}`, json("DELETE")),
  reorderQuestions: (id: string, sectionId: string, ids: string[]) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/questions/reorder`, json("POST", { ids })),
  placeQuestion: (
    id: string,
    sectionId: string,
    questionId: string,
    input: {
      materialBlockId: string | null;
      beforeId?: string | null;
      afterId?: string | null;
      partId?: string | null;
    },
  ) =>
    api<ExamTest>(`${base}/${id}/sections/${sectionId}/questions/${questionId}/place`, json("POST", {
      materialBlockId: input.materialBlockId,
      beforeId: input.beforeId ?? null,
      afterId: input.afterId ?? null,
      partId: input.partId ?? null,
    })),
};
