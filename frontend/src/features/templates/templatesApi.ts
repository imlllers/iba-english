import { api, json } from "@/shared/api/client";
import type { ExamTemplate, PresetSectionSkeleton, TestSettings } from "@/entities/test/types";
import { normalizeTestSettings } from "@/entities/test/settings";

const base = "/api/teacher/templates";

export type TemplateWriteInput = {
  title: string;
  sections: PresetSectionSkeleton[];
  defaultSettings: Partial<TestSettings>;
};

function normalizeTemplate(raw: ExamTemplate): ExamTemplate {
  return {
    ...raw,
    builtinKey: raw.builtinKey ?? null,
    builtin: Boolean(raw.builtin),
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    defaultSettings: normalizeTestSettings(raw.defaultSettings, raw.family),
  };
}

export const templatesApi = {
  list: async () => {
    const items = await api<ExamTemplate[]>(base);
    return items.map(normalizeTemplate);
  },
  get: async (id: string) => normalizeTemplate(await api<ExamTemplate>(`${base}/${id}`)),
  create: async (input: TemplateWriteInput) =>
    normalizeTemplate(await api<ExamTemplate>(base, json("POST", input))),
  update: async (id: string, input: TemplateWriteInput) =>
    normalizeTemplate(await api<ExamTemplate>(`${base}/${id}`, json("PUT", input))),
  remove: (id: string) => api<void>(`${base}/${id}`, json("DELETE")),
  reset: async (id: string) =>
    normalizeTemplate(await api<ExamTemplate>(`${base}/${id}/reset`, json("POST"))),
};

export function emptyCustomSections(): PresetSectionSkeleton[] {
  return [
    {
      title: "Section 1",
      sectionType: "CUSTOM",
      timeLimitMinutes: null,
      instructions: "",
      allowBackToQuestions: null,
      allowBackToPart: null,
      parts: [],
    },
  ];
}

export function defaultCustomSettings(): TestSettings {
  return normalizeTestSettings({ examType: "CUSTOM" }, null);
}
