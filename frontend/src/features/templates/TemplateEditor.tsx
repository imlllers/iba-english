import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { normalizeTestSettings } from "@/entities/test/settings";
import type {
  ExamDisplayType,
  ExamTemplate,
  PresetSectionSkeleton,
  SectionType,
  TestSettings,
} from "@/entities/test/types";
import { templatesApi } from "@/features/templates/templatesApi";
import { EXAM_TYPE_OPTIONS, isExamTypeDisabled } from "@/entities/test/settings";
import { TestSettingsCards } from "@/features/test-builder/TestSettingsCards";
import { testsApi } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { IconButton } from "@/shared/ui/IconButton";
import { COL } from "@/shared/ui/tableCols";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SaveIndicator, type SaveState } from "@/shared/ui/SaveIndicator";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { Switch } from "@/shared/ui/Switch";

const PART_SWITCH_COL = 320;
const PER_PAGE_OPTIONS = [
  { value: "inherit", label: "Как в тесте" },
  { value: "one", label: "По одному" },
  { value: "all", label: "Все сразу" },
];
const PART_ACTION_COL = 50;
const PARTS_TABLE_STYLES = {
  th: { paddingLeft: 0, paddingRight: 0 },
  td: { paddingLeft: 0, paddingRight: 0 },
};

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "LISTENING", label: "Listening" },
  { value: "READING", label: "Reading" },
  { value: "WRITING", label: "Writing" },
  { value: "SPEAKING", label: "Speaking" },
  { value: "CUSTOM", label: "Пользовательская" },
];

type Draft = {
  title: string;
  sections: PresetSectionSkeleton[];
  settings: TestSettings;
};

type Editing = number | "new" | null;

function toDraft(template: ExamTemplate): Draft {
  return {
    title: template.title,
    sections: structuredClone(template.sections),
    settings: normalizeTestSettings(template.defaultSettings, template.family),
  };
}

function useTemplateDraft(template: ExamTemplate | undefined) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(() => (template ? toDraft(template) : null));
  const [state, setState] = useState<SaveState>("idle");
  const latest = useRef<Draft | null>(draft);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const templateRef = useRef(template);
  templateRef.current = template;

  useEffect(() => {
    if (template && latest.current === null) {
      const initial = toDraft(template);
      latest.current = initial;
      setDraft(initial);
    }
  }, [template]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const current = latest.current;
    const source = templateRef.current;
    if (!current || !source || !dirty.current) {
      return true;
    }
    if (!current.title.trim()) {
      setState("error");
      return false;
    }
    dirty.current = false;
    setState("saving");
    try {
      const saved = await templatesApi.update(source.id, {
        title: current.title.trim(),
        sections: current.sections,
        defaultSettings: {
          ...current.settings,
          examType: source.builtin ? source.family : current.settings.examType,
          availableFrom: null,
          availableUntil: null,
        },
      });
      queryClient.setQueryData(["template", source.id], saved);
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      setState(dirty.current ? "saving" : "saved");
      return true;
    } catch (failure) {
      dirty.current = true;
      setState("error");
      notify.error(errorMessage(failure, "Не удалось сохранить шаблон"), { id: "template-save", title: "Шаблон" });
      return false;
    }
  }, [queryClient]);

  const change = useCallback((update: (current: Draft) => Draft, delay = 600) => {
    const current = latest.current;
    if (!current) {
      return;
    }
    const next = update(current);
    latest.current = next;
    dirty.current = true;
    setDraft(next);
    setState("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), delay);
  }, [flush]);

  useEffect(() => () => {
    if (dirty.current) {
      void flush();
    }
  }, [flush]);

  const discard = useCallback(() => {
    window.clearTimeout(timer.current);
    dirty.current = false;
  }, []);

  return { draft, state, change, flush, discard };
}

function sectionTypeLabel(type: SectionType): string {
  return SECTION_TYPES.find((item) => item.value === type)?.label ?? "Пользовательская";
}

function partsSummary(section: PresetSectionSkeleton): string {
  const parts = section.parts ?? [];
  if (parts.length === 0) return "–";
  return parts.map((part, index) => part.title || `Часть ${index + 1}`).join(", ");
}

function newSection(count: number): PresetSectionSkeleton {
  return {
    title: `Section ${count + 1}`,
    sectionType: "CUSTOM",
    timeLimitMinutes: null,
    instructions: "",
    allowBackToQuestions: null,
    allowBackToPart: null,
    parts: [],
  };
}

export function TemplateEditor({ templateId, onRemoved, headerTarget }: {
  templateId: string;
  onRemoved: () => void;
  headerTarget?: HTMLElement | null;
}) {
  const withHeader = (header: ReactNode) => (headerTarget ? createPortal(header, headerTarget) : header);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => templatesApi.get(templateId),
    initialData: () => queryClient.getQueryData<ExamTemplate[]>(["templates"])?.find((item) => item.id === templateId),
    initialDataUpdatedAt: () => queryClient.getQueryState(["templates"])?.dataUpdatedAt,
  });
  const template = query.data;
  const { draft, state, change, flush, discard } = useTemplateDraft(template);
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState(false);
  const [removingItem, setRemovingItem] = useState<{ section: number } | null>(null);

  const remove = useMutation({
    mutationFn: () => templatesApi.remove(templateId),
    onSuccess: () => {
      discard();
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      onRemoved();
    },
  });

  const createTest = useMutation({
    mutationFn: async () => {
      if (!(await flush())) {
        throw new Error("Сначала исправьте шаблон – не удалось сохранить");
      }
      return testsApi.create({ title: draft?.title.trim() || "Новый тест", description: "", templateId });
    },
    onSuccess: (test) => {
      queryClient.setQueryData(["test", test.id], test);
      void queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/teacher/tests/${test.id}`);
    },
    onError: (failure) => {
      notify.error(errorMessage(failure, "Не удалось создать тест"), { title: "Новый тест" });
    },
  });

  if (query.isLoading || (template && !draft)) {
    return (
      <>
        {withHeader(<PageHeader title="Шаблоны тестов" />)}
        <Loading text="Загрузка шаблона…" />
      </>
    );
  }
  if (query.isError || !template || !draft) {
    return (
      <Stack gap="sm">
        {withHeader(<PageHeader title="Шаблоны тестов" />)}
        <SettingsCard>
          <SettingsHint>{errorMessage(query.error, "Шаблон не найден или недоступен")}</SettingsHint>
        </SettingsCard>
      </Stack>
    );
  }

  const examType: ExamDisplayType = template.builtin
    ? (template.family as ExamDisplayType)
    : draft.settings.examType ?? "CUSTOM";

  const patchSettings = (patch: Partial<TestSettings>) =>
    change((current) => ({ ...current, settings: { ...current.settings, ...patch } }), 0);

  const saveSection = (index: number | "new", next: PresetSectionSkeleton) => {
    change((current) => ({
      ...current,
      sections: index === "new"
        ? [...current.sections, next]
        : current.sections.map((item, i) => (i === index ? next : item)),
    }), 0);
    setEditing(null);
  };

  const removeSection = (index: number) => {
    if (draft.sections.length <= 1) {
      return;
    }
    change((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== index) }), 0);
  };

  return (
    <Stack gap="sm">
      {withHeader(
      <PageHeader
        title="Шаблоны тестов"
        actions={
          <>
            <SaveIndicator state={state} />
            {!template.builtin ? (
              <Button variant="subtle" color="red" leftSection={<Icon name="trash" />} onClick={() => setRemoving(true)}>
                Удалить
              </Button>
            ) : null}
            <Button
              leftSection={<Icon name="plus" />}
              loading={createTest.isPending}
              disabled={isExamTypeDisabled(examType)}
              onClick={() => createTest.mutate()}
            >
              Создать тест
            </Button>
          </>
        }
      />
      )}

      <SettingsCard>
        <Stack gap="xs">
          <SettingsSectionTitle>Основное</SettingsSectionTitle>
          <Group gap="md" wrap="nowrap" align="flex-start" grow>
            <TextInput
              label="Название"
              withAsterisk
              value={draft.title}
              maxLength={200}
              placeholder="Введите название"
              error={draft.title.trim() ? undefined : "Укажите название шаблона"}
              onChange={(event) => {
                const value = event.currentTarget.value;
                change((current) => ({ ...current, title: value }), 800);
              }}
            />
            <Select
              label="Тип теста"
              withAsterisk
              value={examType}
              options={EXAM_TYPE_OPTIONS}
              disabled={template.builtin}
              onChange={(value) => patchSettings({ examType: (value as ExamDisplayType) || "CUSTOM" })}
            />
          </Group>
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="xs">
          <SettingsSectionTitle>Структура</SettingsSectionTitle>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w="20%">Секция</Table.Th>
                <Table.Th w="20%">Тип</Table.Th>
                <Table.Th w="40%">Части</Table.Th>
                <Table.Th w="10%" ta="center">Время</Table.Th>
                <Table.Th w={COL.action} ta="center">Действие</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {draft.sections.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <UnstyledButton onClick={() => setEditing(index)}>
                      <Text fw={600} c="iba">{item.title || `Секция ${index + 1}`}</Text>
                    </UnstyledButton>
                  </Table.Td>
                  <Table.Td fz="md">{sectionTypeLabel(item.sectionType)}</Table.Td>
                  <Table.Td fz="md">{partsSummary(item)}</Table.Td>
                  <Table.Td ta="center" fz="md">{item.timeLimitMinutes ? `${item.timeLimitMinutes} мин` : "–"}</Table.Td>
                  <Table.Td>
                    <Group gap="md" wrap="nowrap" justify="center">
                      <IconButton size="lg" variant="subtle" color="gray" label="Изменить секцию" onClick={() => setEditing(index)}>
                        <IconPencil size={20} stroke={1.5} />
                      </IconButton>
                      <IconButton
                        size="lg"
                        variant="subtle"
                        color="red"
                        label="Удалить секцию"
                        tooltip={draft.sections.length > 1 ? "Удалить секцию" : "Должна остаться хотя бы одна секция"}
                        disabled={draft.sections.length <= 1}
                        onClick={() => setRemovingItem({ section: index })}
                      >
                        <Icon name="trash" size={20} />
                      </IconButton>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<Icon name="plus" />}
            style={{ alignSelf: "flex-start" }}
            onClick={() => setEditing("new")}
          >
            Добавить секцию
          </Button>
        </Stack>
      </SettingsCard>

      <TestSettingsCards
        settings={{ ...draft.settings, examType }}
        onChange={patchSettings}
        scaleTargets={draft.sections.map((section, index) => ({
          key: String(index),
          title: section.title || `Секция ${index + 1}`,
          sectionType: section.sectionType,
          binding: { sectionIndex: index },
        }))}
      />

      {editing !== null && (
        <SectionDialog
          section={editing === "new" ? newSection(draft.sections.length) : draft.sections[editing]}
          creating={editing === "new"}
          settings={draft.settings}
          onClose={() => setEditing(null)}
          onSave={(next) => saveSection(editing, next)}
        />
      )}

      <ConfirmDialog
        open={removing}
        title="Удалить шаблон?"
        confirmLabel="Удалить"
        danger
        busy={remove.isPending}
        onClose={() => setRemoving(false)}
        onConfirm={() => remove.mutate()}
      >
        «{draft.title}» будет удалён. Созданные тесты не изменятся.
      </ConfirmDialog>

      <ConfirmDialog
        open={removingItem !== null}
        title="Удалить секцию?"
        confirmLabel="Удалить"
        danger
        onClose={() => setRemovingItem(null)}
        onConfirm={() => {
          if (removingItem) removeSection(removingItem.section);
          setRemovingItem(null);
        }}
      >
        Секция «{removingItem ? draft.sections[removingItem.section]?.title || "Секция" : ""}» будет удалена из шаблона вместе с частями.
      </ConfirmDialog>
    </Stack>
  );
}

type PartRow = { id: number; title: string; oneQuestionPerPage: boolean | null };

let partSeq = 0;

function SectionDialog({ section, creating, settings, onClose, onSave }: {
  section: PresetSectionSkeleton;
  creating: boolean;
  settings: TestSettings;
  onClose: () => void;
  onSave: (section: PresetSectionSkeleton) => void;
}) {
  const [draft, setDraft] = useState(section);
  const [parts, setParts] = useState<PartRow[]>(() =>
    (section.parts ?? []).map((part) => ({ id: ++partSeq, title: part.title, oneQuestionPerPage: part.oneQuestionPerPage ?? null })),
  );
  const [submitted, setSubmitted] = useState(false);
  const patch = (next: Partial<PresetSectionSkeleton>) => setDraft((current) => ({ ...current, ...next }));
  const setPart = (id: number, next: Partial<PartRow>) =>
    setParts((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  const problem = !draft.title.trim() ? "Укажите название секции" : null;

  const save = () => {
    setSubmitted(true);
    if (problem) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      parts: parts
        .filter((part) => part.title.trim())
        .map((part) => ({ title: part.title.trim(), oneQuestionPerPage: part.oneQuestionPerPage })),
    });
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={creating ? "Новая секция" : `Секция ${section.title}`}
      size="calc(4 * var(--grid-col) + 3 * var(--grid-gutter))"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Название"
          withAsterisk
          value={draft.title}
          maxLength={200}
          placeholder="Listening"
          data-autofocus
          error={submitted && problem ? problem : undefined}
          onChange={(event) => patch({ title: event.currentTarget.value })}
        />
        <Select
          label="Тип секции"
          withAsterisk
          value={draft.sectionType}
          options={SECTION_TYPES}
          onChange={(value) => patch({ sectionType: (value as SectionType) || "CUSTOM" })}
        />
        <NumberInput
          hideControls
          label="Лимит времени, мин"
          placeholder="Без ограничения"
          value={draft.timeLimitMinutes ?? ""}
          min={0}
          max={600}
          allowDecimal={false}
          onChange={(value) => patch({ timeLimitMinutes: typeof value === "number" && value > 0 ? value : null })}
        />
            <Switch
              label="Можно возвращаться к заданиям в секции"
              checked={draft.allowBackToQuestions ?? settings.allowBackToQuestions ?? true}
              onChange={(checked) => patch({ allowBackToQuestions: checked })}
            />
            <Switch
              label="Можно возвращаться к частям в секции"
              checked={draft.allowBackToPart ?? settings.allowBackToPart ?? true}
              onChange={(checked) => patch({ allowBackToPart: checked })}
            />

        <Stack gap={4}>
          <Text size="md" fw={700}>Части</Text>
          {parts.length === 0 ? <SettingsHint>Без частей – задания идут сразу в секции</SettingsHint> : (
            <Table verticalSpacing={6} highlightOnHover={false} styles={PARTS_TABLE_STYLES}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Название</Table.Th>
                  <Table.Th w={PART_SWITCH_COL} ta="center">Вопросы на странице</Table.Th>
                  <Table.Th w={PART_ACTION_COL} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {parts.map((part, index) => (
                  <Table.Tr key={part.id}>
                    <Table.Td>
                      <TextInput
                        aria-label={`Часть ${index + 1}`}
                        placeholder={`Part ${index + 1}`}
                        value={part.title}
                        onChange={(event) => setPart(part.id, { title: event.currentTarget.value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group justify="center">
                        <SegmentedControl
                          size="sm"
                          aria-label={`Часть ${index + 1}: вопросы на странице`}
                          data={PER_PAGE_OPTIONS}
                          value={part.oneQuestionPerPage === null ? "inherit" : part.oneQuestionPerPage ? "one" : "all"}
                          onChange={(value) => setPart(part.id, { oneQuestionPerPage: value === "inherit" ? null : value === "one" })}
                        />
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <IconButton size="lg" variant="subtle" color="gray" label="Удалить часть" onClick={() => setParts((current) => current.filter((item) => item.id !== part.id))}>
                          <Icon name="close" size={20} />
                        </IconButton>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<Icon name="plus" />}
            style={{ alignSelf: "flex-start" }}
            onClick={() => setParts((current) => [...current, { id: ++partSeq, title: `Part ${current.length + 1}`, oneQuestionPerPage: null }])}
          >
            Добавить часть
          </Button>
        </Stack>

        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button onClick={save}>Готово</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
