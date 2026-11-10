import { Alert, Button, Group, Stack, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { ExamDisplayType, ScaleSectionBinding, SectionType, TestScoreScale } from "@/entities/test/types";
import { EXAM_TYPE_OPTIONS } from "@/entities/test/settings";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { scaleExamType, scaleSectionType, scoreScalesApi, sectionHint, sectionTypeLabel, type ScoreScale } from "./scoreScale";

export type ScaleTarget = { key: string; title: string; sectionType?: SectionType; binding: ScaleSectionBinding };

function typedMatches(scale: ScoreScale, targets: ScaleTarget[]): (ScaleTarget | null)[] {
  const used = new Set<string>();
  return scale.sections.map((section) => {
    const type = scaleSectionType(section);
    if (type === "CUSTOM") return null;
    const match = targets.find((target) => !used.has(target.key) && target.sectionType === type) ?? null;
    if (match) used.add(match.key);
    return match;
  });
}

const sameBinding = (a: ScaleSectionBinding, b: ScaleSectionBinding) =>
  (a.sectionId ?? null) === (b.sectionId ?? null) && (a.sectionIndex ?? null) === (b.sectionIndex ?? null);

const canon = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canon);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as object).sort().map((key) => [key, canon((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
};

const withTypes = (scale: ScoreScale): ScoreScale => ({
  ...scale,
  title: "",
  examType: scaleExamType(scale),
  sections: scale.sections.map((section) => ({ ...section, sectionType: scaleSectionType(section) })),
});

const sameScale = (a: ScoreScale, b: ScoreScale) => JSON.stringify(canon(withTypes(a))) === JSON.stringify(canon(withTypes(b)));

function autoBind(scale: ScoreScale, targets: ScaleTarget[]): ScaleSectionBinding[] {
  const used = new Set<string>();
  return scale.sections.map((section) => {
    const name = section.name.trim().toLowerCase();
    const match = targets.find((target) => !used.has(target.key) && target.title.trim().toLowerCase().includes(name))
      ?? targets.find((target) => !used.has(target.key) && name.includes(target.title.trim().toLowerCase()));
    if (!match) return {};
    used.add(match.key);
    return match.binding;
  });
}

export function ScaleBindingCard({ value, examType, targets, onChange }: {
  value: TestScoreScale | null;
  examType: ExamDisplayType;
  targets: ScaleTarget[];
  onChange: (next: TestScoreScale | null) => void;
}) {
  const scales = useQuery({ queryKey: ["score-scales"], queryFn: scoreScalesApi.list, refetchOnWindowFocus: true });
  const source = scales.data?.find((item) => item.id === value?.sourceId);
  const outdated = Boolean(value && source && !sameScale(source, value.scale));

  const choose = (id: string) => {
    const scale = scales.data?.find((item) => item.id === id);
    if (!scale) {
      onChange(null);
      return;
    }
    onChange({ sourceId: scale.id, scale: structuredClone(scale), sections: autoBind(scale, targets) });
  };

  const refresh = () => {
    if (!value || !source) return;
    const sections = source.sections.map((section, index) => {
      const previous = value.scale.sections.findIndex((item) => item.name === section.name);
      return previous >= 0 ? value.sections[previous] ?? {} : value.sections[index] ?? {};
    });
    onChange({ sourceId: source.id, scale: structuredClone(source), sections });
  };

  const fitting = (scales.data ?? []).filter((scale) => scaleExamType(scale) === examType);
  const options = [
    { value: "", label: "Без шкалы" },
    ...fitting.map((scale) => ({ value: scale.id, label: scale.title })),
  ];
  if (value && !source) {
    options.push({ value: value.sourceId, label: `${value.scale.title} (шкала удалена)` });
  } else if (value && source && !fitting.includes(source)) {
    options.push({ value: source.id, label: `${source.title} (другой тип теста)` });
  }
  const typeLabel = EXAM_TYPE_OPTIONS.find((option) => option.value === examType)?.label ?? examType;
  const autoMatches = value ? typedMatches(value.scale, targets) : [];

  const seen = useRef<{ type: ExamDisplayType; count: number } | null>(null);
  useEffect(() => {
    if (!scales.data) return;
    const previous = seen.current;
    seen.current = { type: examType, count: fitting.length };
    if (!previous || fitting.length !== 1) return;
    const typeChanged = previous.type !== examType;
    const firstAppeared = !typeChanged && previous.count === 0 && !value;
    const keep = source !== undefined && fitting.includes(source);
    if ((typeChanged && !keep) || firstAppeared) choose(fitting[0].id);
  }, [scales.data, examType, fitting.length]);

  return (
    <SettingsCard>
      <Stack gap="md">
        <Stack gap={6}>
          <SettingsSectionTitle>Шкала баллов</SettingsSectionTitle>
          <SettingsHint>
            Шкалы настраиваются в разделе{" "}
            <Text component={Link} to="/teacher/settings?section=scale" inherit c="iba">«Шкалы баллов»</Text>
          </SettingsHint>
        </Stack>
        <Stack gap={4}>
          <Select label="Шкала" value={value?.sourceId ?? ""} options={options} onChange={choose} />
          {scales.isSuccess && fitting.length === 0 && (
            <SettingsHint>
              Шкал типа «{typeLabel}» нет.{" "}
              <Text
                component={Link}
                to={`/teacher/settings?section=scale&create=${examType}`}
                target="_blank"
                rel="noopener noreferrer"
                inherit
                c="iba"
              >
                Создать шкалу
              </Text>
            </SettingsHint>
          )}
        </Stack>
        {outdated && (
          <Alert color="iba" variant="light">
            <Group justify="space-between" gap="md" wrap="nowrap">
              <Text size="sm">«{source?.title}» изменился после привязки. Тест считает по сохранённой копии.</Text>
              <Button variant="subtle" onClick={refresh} style={{ flexShrink: 0 }}>Обновить</Button>
            </Group>
          </Alert>
        )}
        {value && value.scale.sections.length > 0 ? (
          <Table verticalSpacing="xs" highlightOnHover={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w="50%">Секция</Table.Th>
                <Table.Th w="50%">Балл</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {value.scale.sections.map((section, index) => {
                const binding = value.sections[index] ?? {};
                const selected = targets.find((target) => sameBinding(target.binding, binding));
                const type = scaleSectionType(section);
                const auto = autoMatches[index];
                return (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Stack gap={4}>
                        <Text fw={600}>{section.name}</Text>
                        {auto ? (
                          auto.title.trim().toLowerCase() !== section.name.trim().toLowerCase() ? (
                            <SettingsHint>в тесте: {auto.title}</SettingsHint>
                          ) : null
                        ) : (
                          <Select
                            size="sm"
                            ariaLabel={`Секция теста для «${section.name}»`}
                            value={selected?.key ?? ""}
                            options={[
                              { value: "", label: type === "CUSTOM" ? "Не учитывать" : `Нет секции ${sectionTypeLabel(type)} – не учитывать` },
                              ...targets.map((target) => ({ value: target.key, label: target.title })),
                            ]}
                            onChange={(key) => {
                              const target = targets.find((item) => item.key === key);
                              const sections = value.scale.sections.map((_, at) => (at === index ? (target?.binding ?? {}) : value.sections[at] ?? {}));
                              onChange({ ...value, sections });
                            }}
                          />
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td fz="md">{sectionHint(section)}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : null}
      </Stack>
    </SettingsCard>
  );
}
