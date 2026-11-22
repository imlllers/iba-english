import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { ExamDisplayType, ScaleSectionBinding, SectionType, TestScoreScale } from "@/entities/test/types";
import { Select } from "@/shared/ui/Select";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { preferredScoreScale, scaleExamType, scaleSectionType, scoreScalesApi, type ScoreScale } from "./scoreScale";

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

export function ScaleBindingField({ value, examType, examPreset, targets, onChange }: {
  value: TestScoreScale | null;
  examType: ExamDisplayType;
  examPreset?: string | null;
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
  const preferred = preferredScoreScale(scales.data ?? [], examType, examPreset);
  const seen = useRef<{ type: ExamDisplayType; preset: string | null } | null>(null);
  useEffect(() => {
    if (!scales.data || !preferred) return;
    const previous = seen.current;
    seen.current = { type: examType, preset: examPreset ?? null };
    const typeChanged = Boolean(previous && previous.type !== examType);
    const keep = source !== undefined && fitting.includes(source);
    if ((typeChanged && !keep) || (!value && !previous)) choose(preferred.id);
  }, [scales.data, examType, examPreset, preferred?.id, fitting.length]);

  useEffect(() => {
    if (!value || targets.length === 0) return;
    const auto = typedMatches(value.scale, targets);
    const next = value.scale.sections.map((_, index) => {
      const existing = value.sections[index] ?? {};
      if (existing.sectionId || existing.sectionIndex != null) return existing;
      return auto[index]?.binding ?? {};
    });
    if (JSON.stringify(canon(next)) === JSON.stringify(canon(value.sections))) return;
    onChange({ ...value, sections: next });
  }, [value, targets]);

  return (
    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Select
        label="Шкала перевода баллов"
        withAsterisk
        value={value?.sourceId ?? ""}
        options={options}
        onChange={choose}
      />
      {scales.isSuccess && fitting.length === 0 && (
        <SettingsHint>
          Для выбранного типа теста подходящих шкал нет.{" "}
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
      {outdated && (
        <Alert color="iba" variant="light">
          <Group justify="space-between" gap="md" wrap="nowrap">
            <Text size="sm">«{source?.title}» изменился после привязки. Тест считает по сохранённой копии.</Text>
            <Button variant="subtle" onClick={refresh} style={{ flexShrink: 0 }}>Обновить</Button>
          </Group>
        </Alert>
      )}
    </Stack>
  );
}