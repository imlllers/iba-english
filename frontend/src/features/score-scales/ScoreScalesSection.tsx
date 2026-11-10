import {
  Alert, Badge, Box, Button, Grid, Group, Modal, NavLink, NumberInput, ScrollArea, SimpleGrid, Stack, Table, Text, TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage } from "@/shared/api/client";
import { plural } from "@/shared/lib/format";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { IconButton } from "@/shared/ui/IconButton";
import { COL } from "@/shared/ui/tableCols";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import {
  SCALE_SECTION_TYPES, TOTAL_RULES, convertOf, formatNumber, isManual, scaleExamType, scaleSectionType, sectionTypeLabel, newScale, normalizeScale, scoreScalesApi, validateScale, withTotalRule,
  type Aggregate, type ConvertRow, type ScaleSection, type ScoreScale,
} from "./scoreScale";
import type { ScaleLevel } from "@/entities/scale/types";
import type { ExamDisplayType, ExamTemplate, SectionType } from "@/entities/test/types";
import { templatesApi } from "@/features/templates/templatesApi";
import { EXAM_TYPE_OPTIONS, isExamTypeDisabled } from "@/entities/test/settings";

const KEY = ["score-scales"];

const BUILTIN_IDS = new Set(["ielts", "toefl", "toeic"]);

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

const same = (a: ScoreScale, b: ScoreScale | undefined) => Boolean(b) && JSON.stringify(a) === JSON.stringify(b);

const num = (value: string | number, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

export function ScoreScalesSection() {
  const queryClient = useQueryClient();
  const scales = useQuery({ queryKey: KEY, queryFn: scoreScalesApi.list });
  const saved = scales.data ?? [];
  const [drafts, setDrafts] = useState<Record<string, ScoreScale>>({});
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const setSelectedId = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("id", id);
    else next.delete("id");
    setParams(next, { replace: true });
  };
  const [removing, setRemoving] = useState<ScoreScale | null>(null);

  const unsavedNew = Object.values(drafts).filter((draft) => !saved.some((item) => item.id === draft.id));
  const entries = [...saved, ...unsavedNew];
  const available = entries.filter((item) => !isExamTypeDisabled(scaleExamType(item)));
  const selected = available.find((item) => item.id === selectedId) ?? available[0] ?? null;
  const draft = selected ? drafts[selected.id] ?? selected : null;
  const original = selected ? saved.find((item) => item.id === selected.id) : undefined;
  const dirty = draft ? !same(draft, original) : false;
  const problem = draft ? validateScale(draft) : null;

  useEffect(() => {
    if (scales.isSuccess && selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [scales.isSuccess, selected?.id, selectedId]);

  const dropDraft = (id: string) => setDrafts((current) => {
    const next = { ...current };
    delete next[id];
    return next;
  });

  const save = useMutation({
    mutationFn: scoreScalesApi.save,
    onSuccess: (next) => {
      queryClient.setQueryData(KEY, next);
      setRemoving(null);
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось сохранить шкалу")),
  });

  const commit = () => {
    if (!draft || problem) return;
    const clean = normalizeScale(draft);
    const list = original ? saved.map((item) => (item.id === clean.id ? clean : item)) : [...saved, clean];
    save.mutate(list, {
      onSuccess: () => {
        dropDraft(clean.id);
        notify.success("Шкала сохранена");
      },
    });
  };

  const remove = (scale: ScoreScale) => {
    if (!saved.some((item) => item.id === scale.id)) {
      dropDraft(scale.id);
      setSelectedId(null);
      return;
    }
    setRemoving(scale);
  };

  const create = (examType?: ExamDisplayType) => {
    const scale = newScale(examType);
    setDrafts((current) => ({ ...current, [scale.id]: scale }));
    const next = new URLSearchParams(params);
    next.delete("create");
    next.set("id", scale.id);
    setParams(next, { replace: true });
    save.reset();
  };

  const createType = params.get("create");
  const handledCreate = useRef(false);
  useEffect(() => {
    if (!scales.isSuccess || !createType || handledCreate.current) return;
    handledCreate.current = true;
    create(EXAM_TYPE_OPTIONS.find((option) => option.value === createType)?.value ?? "CUSTOM");
  }, [scales.isSuccess, createType]);

  const templates = useQuery({ queryKey: ["templates"], queryFn: templatesApi.list });
  const usedIn = draft ? (templates.data ?? []).filter((template) => template.defaultSettings.scoreScale?.sourceId === draft.id) : [];

  return (
    <Stack gap="sm">
      <PageHeader
        title="Шкалы баллов"
        actions={
          draft ? (
            <Group gap="md" wrap="nowrap">
              {!BUILTIN_IDS.has(draft.id) && (
                <Button variant="subtle" color="red" leftSection={<Icon name="trash" />} onClick={() => remove(draft)}>
                  Удалить
                </Button>
              )}
              {dirty && original && (
                <Button variant="subtle" color="gray" onClick={() => dropDraft(draft.id)}>Отменить</Button>
              )}
              <Button disabled={!dirty || problem !== null} loading={save.isPending} onClick={commit}>
                Сохранить
              </Button>
            </Group>
          ) : null
        }
      />
      {scales.isLoading && <Loading />}
      {scales.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(scales.error, "Не удалось загрузить шкалы баллов")}</Alert>
      )}

      {scales.data && (
        <Grid columns={10} gap="var(--grid-gutter)" align="flex-start">
          <Grid.Col span={{ base: 10, md: 2 }}>
            <SettingsCard>
              <Stack gap="sm">
                <Group justify="space-between" gap="md" wrap="nowrap">
                  <SettingsSectionTitle>Шкалы</SettingsSectionTitle>
                  <IconButton variant="subtle" color="gray" size="lg" label="Добавить шкалу" onClick={() => create()}>
                    <Icon name="plus" size={20} />
                  </IconButton>
                </Group>
                <Stack gap={4}>
                  {entries.map((item) => {
                    const shown = drafts[item.id] ?? item;
                    const changed = !same(shown, saved.find((one) => one.id === item.id));
                    const off = isExamTypeDisabled(scaleExamType(shown));
                    return (
                      <NavLink
                        key={item.id}
                        component="button"
                        type="button"
                        noWrap
                        disabled={off}
                        active={item.id === selected?.id}
                        label={shown.title || "Без названия"}
                        styles={{ label: { fontWeight: 600 } }}
                        rightSection={
                          BUILTIN_IDS.has(item.id) || changed || off ? (
                            <Group gap="xs" wrap="nowrap">
                              {off && <Badge variant="light" color="gray" size="xs">недоступен</Badge>}
                              {!off && BUILTIN_IDS.has(item.id) && <Badge variant="light" color="gray" size="xs">встроенный</Badge>}
                              {changed && <Box w={8} h={8} bg="orange" style={{ borderRadius: "50%" }} title="Есть несохранённые изменения" />}
                            </Group>
                          ) : null
                        }
                        onClick={() => { setSelectedId(item.id); save.reset(); }}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            </SettingsCard>
          </Grid.Col>

          <Grid.Col span={{ base: 10, md: 8 }}>
            {draft ? (
              <Stack gap="sm">
                {problem && dirty && <Alert color="orange" variant="light">{problem}</Alert>}
                <ScaleEditor
                  key={draft.id}
                  draft={draft}
                  usedIn={usedIn}
                  onChange={(next) => setDrafts((current) => ({ ...current, [next.id]: next }))}
                />
              </Stack>
            ) : (
              <EmptyState title="Шкал нет">Нажмите «+», чтобы добавить шкалу и её таблицу перевода</EmptyState>
            )}
          </Grid.Col>
        </Grid>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Удалить шкалу?"
        confirmLabel="Удалить"
        danger
        busy={save.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const id = removing.id;
          save.mutate(saved.filter((item) => item.id !== id), {
            onSuccess: () => {
              dropDraft(id);
              setSelectedId(null);
            },
          });
        }}
      >
        Шкала «{removing?.title}» будет удалена. Шаблоны и тесты, где она выбрана, продолжат считать по своей копии
      </ConfirmDialog>
    </Stack>
  );
}

function ScaleEditor({ draft, usedIn, onChange }: {
  draft: ScoreScale;
  usedIn: ExamTemplate[];
  onChange: (next: ScoreScale) => void;
}) {
  const patch = (next: Partial<ScoreScale>) => onChange({ ...draft, ...next });
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [removingSection, setRemovingSection] = useState<number | null>(null);

  const saveSection = (next: ScaleSection) => {
    if (editing === "new") patch({ sections: [...draft.sections, next] });
    else if (editing !== null) patch({ sections: draft.sections.map((item, at) => (at === editing ? next : item)) });
    setEditing(null);
  };

  return (
    <>
      <SettingsCard>
        <Stack gap="xs">
          <Stack gap={6}>
            <SettingsSectionTitle>Основное</SettingsSectionTitle>
            <SettingsHint>
              {usedIn.length === 0 ? (
                "Пока не выбрана ни в одном шаблоне"
              ) : (
                <>
                  {usedIn.length === 1 ? "Используется в шаблоне " : "Используется в шаблонах "}
                  {usedIn.map((template, index) => (
                    <Fragment key={template.id}>
                      {index > 0 && ", "}
                      <Text component={Link} to={`/teacher/settings?section=template&id=${template.id}`} inherit c="iba">
                        {template.title}
                      </Text>
                    </Fragment>
                  ))}
                  . Изменения попадут в шаблон, только если нажать в нём «Обновить»
                </>
              )}
            </SettingsHint>
          </Stack>
          <Group gap="md" wrap="nowrap" align="flex-start" grow>
            <TextInput
              label="Название"
              withAsterisk
              value={draft.title}
              maxLength={120}
              onChange={(event) => patch({ title: event.currentTarget.value })}
            />
            <Select
              label="Тип теста"
              withAsterisk
              value={scaleExamType(draft)}
              options={EXAM_TYPE_OPTIONS}
              disabled={BUILTIN_IDS.has(draft.id)}
              onChange={(value) => patch({ examType: (value as ExamDisplayType) || "CUSTOM" })}
            />
          </Group>
          <Select
            label="Как считать итоговый балл"
            value={draft.aggregate}
            options={TOTAL_RULES.map((rule) => ({ value: rule.value, label: rule.label }))}
            onChange={(value) => onChange(withTotalRule(draft, (value as Aggregate) || "sum"))}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="xs">
          <SettingsSectionTitle>Секции</SettingsSectionTitle>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Секция</Table.Th>
                <Table.Th>Балл</Table.Th>
                <Table.Th>Перевод</Table.Th>
                <Table.Th w={COL.action} ta="center">Действие</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {draft.sections.map((section, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <UnstyledButton onClick={() => setEditing(index)}>
                      <Text fw={600} c="iba">{section.name || "Без названия"}</Text>
                    </UnstyledButton>
                  </Table.Td>
                  <Table.Td fz="md">{isManual(section) ? "Ставит проверяющий" : "По таблице"}</Table.Td>
                  <Table.Td fz="md">{sectionSummary(section)}</Table.Td>
                  <Table.Td>
                    <Group gap="md" wrap="nowrap" justify="center">
                      <IconButton size="lg" variant="subtle" color="gray" label="Изменить секцию" onClick={(event) => { event.stopPropagation(); setEditing(index); }}>
                        <IconPencil size={20} stroke={1.5} />
                      </IconButton>
                      <IconButton
                        size="lg"
                        variant="subtle"
                        color="red"
                        label="Удалить секцию"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRemovingSection(index);
                        }}
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

      <SettingsCard>
        <Stack gap="xs">
          <SettingsSectionTitle>Уровни CEFR</SettingsSectionTitle>
          <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="md">
            {CEFR.map((label) => (
              <LevelField
                key={label}
                label={label}
                level={draft.levels.find((item) => item.label === label)}
                onChange={(level) => {
                  const rest = draft.levels.filter((item) => item.label !== label);
                  const next = level ? [...rest, level] : rest;
                  patch({ levels: next.sort((a, b) => CEFR.indexOf(a.label) - CEFR.indexOf(b.label)) });
                }}
              />
            ))}
          </SimpleGrid>
        </Stack>
      </SettingsCard>

      <ConfirmDialog
        open={removingSection !== null}
        title="Удалить секцию?"
        confirmLabel="Удалить"
        danger
        onClose={() => setRemovingSection(null)}
        onConfirm={() => {
          patch({ sections: draft.sections.filter((_, at) => at !== removingSection) });
          setRemovingSection(null);
        }}
      >
        Секция «{removingSection !== null ? draft.sections[removingSection]?.name || "Без названия" : ""}» и её таблица будут удалены.
        Изменение применится после «Сохранить».
      </ConfirmDialog>

      {editing !== null && (
        <SectionDialog
          section={editing === "new" ? newScaleSection(draft.sections) : draft.sections[editing]}
          creating={editing === "new"}
          onClose={() => setEditing(null)}
          onSave={saveSection}
        />
      )}
    </>
  );
}

function LevelField({ label, level, onChange }: {
  label: string;
  level: ScaleLevel | undefined;
  onChange: (level: ScaleLevel | null) => void;
}) {
  const shown = level ? (level.max == null ? formatNumber(level.min) : `${formatNumber(level.min)}-${formatNumber(level.max)}`) : "";
  const [text, setText] = useState(shown);
  const invalid = text.trim() !== "" && parseLevel(text) === null;

  return (
    <TextInput
      label={label}
      placeholder="–"
      value={text}
      error={invalid}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        if (!next.trim()) {
          onChange(null);
          return;
        }
        const parsed = parseLevel(next);
        if (parsed) onChange({ label, ...parsed });
      }}
    />
  );
}

function parseLevel(text: string): { min: number; max?: number } | null {
  const number = "(\\d+(?:[.,]\\d+)?)";
  const match = text.trim().match(new RegExp(`^${number}(?:\\s*[-–—]\\s*${number})?$`));
  if (!match) return null;
  const min = Number(match[1].replace(",", "."));
  if (match[2] === undefined) return { min };
  const max = Number(match[2].replace(",", "."));
  return min <= max ? { min, max } : null;
}

function newScaleSection(existing: ScaleSection[]): ScaleSection {
  const used = new Set(existing.map(scaleSectionType));
  const free = SCALE_SECTION_TYPES.find((item) => item.value !== "CUSTOM" && !used.has(item.value));
  return {
    name: free ? free.label : "",
    sectionType: free ? free.value : "CUSTOM",
    min: 0,
    max: 0,
    step: 0.5,
    convert: { method: "table", table: [] },
  };
}

type RangeRow = { id: number; range: string; score: number | "" };

const MAX_ADD_ROWS = 200;
const RANGE_ARROW_COL = 48;
const RANGE_ACTION_COL = 50;
const RANGE_TABLE_STYLES = {
  th: { paddingLeft: 0, paddingRight: 0 },
  td: { paddingLeft: 0, paddingRight: 0 },
};

let rowSeq = 0;
const nextRowId = () => ++rowSeq;

function SectionDialog({ section, creating, onClose, onSave }: {
  section: ScaleSection;
  creating: boolean;
  onClose: () => void;
  onSave: (section: ScaleSection) => void;
}) {
  const [type, setType] = useState<SectionType>(scaleSectionType(section));
  const [name, setName] = useState(scaleSectionType(section) === "CUSTOM" ? section.name : "");
  const [manual, setManual] = useState(isManual(section));
  const [range, setRange] = useState({ min: section.min, max: section.max, step: section.step || 0.5 });
  const [rows, setRows] = useState<RangeRow[]>(() =>
    [...(convertOf(section).table ?? [])]
      .sort((a, b) => b.from - a.from)
      .map((row) => ({ id: nextRowId(), range: formatRange(row), score: row.score })),
  );
  const [touched, setTouched] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [addCount, setAddCount] = useState<number | "">(1);
  const addRows = typeof addCount === "number" && addCount >= 1 ? addCount : 1;
  const setRow = (id: number, next: Partial<RangeRow>) =>
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));

  const filled = rows.filter((row) => row.range.trim() !== "" || row.score !== "");
  const rowInvalid = (row: RangeRow) =>
    (row.range.trim() !== "" || row.score !== "") && (parseRange(row.range) === null || row.score === "");
  const finalName = type === "CUSTOM" ? name.trim() : sectionTypeLabel(type);
  const problem = !finalName
    ? "Укажите название секции"
    : manual
      ? range.min > range.max ? "«Балл от» больше «до»" : null
      : filled.length === 0
        ? "Заполните хотя бы одну строку"
        : filled.some(rowInvalid) ? "Проверьте строки, выделенные красным: число или диапазон «от-до» и балл" : null;

  const save = () => {
    setSubmitted(true);
    if (problem) return;
    if (manual) {
      onSave({ ...section, name: finalName, sectionType: type, min: range.min, max: range.max, step: range.step, convert: { method: "manual" } });
      return;
    }
    const table = filled.map((row) => ({ ...(parseRange(row.range) as { from: number; to: number }), score: row.score as number }));
    const scores = table.map((row) => row.score);
    onSave({ ...section, name: finalName, sectionType: type, min: Math.min(...scores), max: Math.max(...scores), convert: { method: "table", table } });
  };

  return (
    <Modal opened onClose={onClose} title={creating ? "Новая секция" : `Секция ${section.name}`} size="calc(4 * var(--grid-col) + 3 * var(--grid-gutter))" centered>
      <Stack gap="md">
        <Select
          label="Тип секции"
          value={type}
          options={SCALE_SECTION_TYPES}
          onChange={(value) => setType((value as SectionType) || "CUSTOM")}
        />
        {type === "CUSTOM" ? (
          <TextInput
            label="Название"
            withAsterisk
            placeholder="Grammar"
            value={name}
            error={submitted && !name.trim() ? "Укажите название секции" : undefined}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        ) : null}
        <Select
          label="Балл"
          value={manual ? "manual" : "table"}
          options={[
            { value: "table", label: "По таблице" },
            { value: "manual", label: "Ставит проверяющий" },
          ]}
          onChange={(value) => setManual(value === "manual")}
        />

        {manual ? (
          <Group gap="md" wrap="nowrap">
            <NumberInput hideControls label="Мин. балл" value={range.min} style={{ flex: 1 }} decimalScale={2} onChange={(value) => setRange((current) => ({ ...current, min: num(value, 0) }))} />
            <NumberInput hideControls label="Макс. балл" value={range.max} style={{ flex: 1 }} decimalScale={2} onChange={(value) => setRange((current) => ({ ...current, max: num(value, 0) }))} />
            <NumberInput hideControls label="Шаг" value={range.step} min={0} style={{ flex: 1 }} decimalScale={2} onChange={(value) => setRange((current) => ({ ...current, step: num(value, 1) }))} />
          </Group>
        ) : (
          <Stack gap={4}>
            <Text size="md" fw={700}>Таблица перевода</Text>
            <SettingsHint>
              Слева – число правильных ответов или диапазон, например <span style={{ whiteSpace: "nowrap" }}>1-5</span>, справа – итоговый балл
            </SettingsHint>
            <ScrollArea.Autosize mah="45vh" type="hover" offsetScrollbars="present">
              <Table stickyHeader verticalSpacing={6} highlightOnHover={false} withRowBorders={false} styles={RANGE_TABLE_STYLES}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ whiteSpace: "nowrap" }}>Правильных ответов</Table.Th>
                    <Table.Th w={RANGE_ARROW_COL} />
                    <Table.Th>Балл</Table.Th>
                    <Table.Th w={RANGE_ACTION_COL} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => {
                    const showError = (submitted || touched.has(row.id)) && rowInvalid(row);
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <TextInput
                            size="sm"
                            aria-label="Правильных ответов"
                            placeholder="1-5"
                            value={row.range}
                            error={showError && parseRange(row.range) === null}
                            onChange={(event) => setRow(row.id, { range: event.currentTarget.value })}
                            onBlur={() => setTouched((current) => new Set(current).add(row.id))}
                          />
                        </Table.Td>
                        <Table.Td c="dimmed">
                          <Group justify="center"><Icon name="arrowRight" size={18} /></Group>
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="sm"
                            hideControls
                            aria-label="Балл"
                            placeholder="Балл"
                            value={row.score}
                            decimalScale={2}
                            error={showError && row.score === ""}
                            onChange={(value) => setRow(row.id, { score: typeof value === "number" && Number.isFinite(value) ? value : "" })}
                            onBlur={() => setTouched((current) => new Set(current).add(row.id))}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Group justify="flex-end">
                            <IconButton size="lg" variant="subtle" color="gray" label="Удалить строку" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
                              <Icon name="close" size={20} />
                            </IconButton>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
            <Group gap="xs" wrap="nowrap">
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<Icon name="plus" />}
                onClick={() => setRows((current) => [...current, ...Array.from({ length: addRows }, () => ({ id: nextRowId(), range: "", score: "" as const }))])}
              >
                Добавить
              </Button>
              <NumberInput
                size="xs"
                w={64}
                hideControls
                allowDecimal={false}
                allowNegative={false}
                min={1}
                max={MAX_ADD_ROWS}
                clampBehavior="strict"
                aria-label="Сколько строк добавить"
                value={addCount}
                onChange={(value) => setAddCount(typeof value === "number" ? value : "")}
                onBlur={() => setAddCount(addRows)}
              />
              <Text size="sm" fw={600}>{plural(addRows, "строку", "строки", "строк")}</Text>
            </Group>
          </Stack>
        )}

        {submitted && problem && <Text size="sm" c="red">{problem}</Text>}
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button onClick={save}>Готово</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function formatRange(row: ConvertRow): string {
  return row.from === row.to ? String(row.from) : `${row.from}-${row.to}`;
}

function parseRange(text: string): { from: number; to: number } | null {
  const match = text.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
  if (!match) return null;
  const from = Number(match[1]);
  const to = match[2] === undefined ? from : Number(match[2]);
  return from <= to ? { from, to } : null;
}

function sectionSummary(section: ScaleSection): string {
  if (isManual(section)) return `${formatNumber(section.min)}-${formatNumber(section.max)}, шаг ${formatNumber(section.step)}`;
  const rows = convertOf(section).table ?? [];
  if (!rows.length) return "Таблица пустая";
  const top = Math.max(...rows.map((row) => row.to));
  const scores = rows.map((row) => row.score);
  return `0-${top} правильных → ${formatNumber(Math.min(...scores))}-${formatNumber(Math.max(...scores))}`;
}
