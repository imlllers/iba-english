import { Stack, TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { EXAM_TYPE_OPTIONS } from "@/entities/test/settings";
import type { ExamDisplayType, ExamTest, TestSettings } from "@/entities/test/types";
import { serializeInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { InstructionsField } from "@/features/question-types/widgets/InstructionsField";
import type { TestMetaInput } from "@/features/tests/testsApi";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { TestSettingsCards } from "./TestSettingsCards";

type TestFormProps = {
  test: ExamTest;
  onChange: (patch: Partial<TestMetaInput>, delay?: number) => void;
};

export function TestForm({ test, onChange }: TestFormProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(test.title);

  useEffect(() => {
    if (document.activeElement !== titleRef.current) {
      setTitle(test.title);
    }
  }, [test.title]);

  const settings = (patch: Partial<TestSettings>, delay = 0) =>
    onChange({ settings: { ...test.settings, ...patch } }, delay);

  return (
    <Stack gap="sm">
      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>О тесте</SettingsSectionTitle>
          <Select
            label="Тип теста"
            withAsterisk
            value={test.settings.examType ?? "CUSTOM"}
            options={EXAM_TYPE_OPTIONS}
            onChange={(value) => settings({ examType: (value as ExamDisplayType) || "CUSTOM" })}
          />
          <SettingsHint>Влияет только на оформление прохождения, структуру секций не меняет</SettingsHint>
          <TextInput
            ref={titleRef}
            label="Название"
            withAsterisk
            value={title}
            maxLength={200}
            placeholder="Введите название"
            error={title.trim() ? undefined : "Укажите название теста"}
            onChange={(event) => {
              setTitle(event.currentTarget.value);
              onChange({ title: event.currentTarget.value }, 800);
            }}
          />
          <InstructionsField
            label="Описание для участника"
            value={test.description}
            toolbar="inline"
            blankTools={false}
            onChange={(doc) => onChange({ description: serializeInstructionDoc(doc) }, 800)}
          />
        </Stack>
      </SettingsCard>

      <TestSettingsCards
        settings={test.settings}
        onChange={(patch) => settings(patch)}
        scaleTargets={test.sections.map((section) => ({
          key: section.id,
          title: section.title,
          sectionType: section.sectionType,
          binding: { sectionId: section.id },
        }))}
      />
    </Stack>
  );
}
