import { SimpleGrid, Stack, Text } from "@mantine/core";
import { useEffect } from "react";
import type { Criterion } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { NumberField } from "../../widgets/NumberField";
import type { EditorProps } from "../types";

export function ManualScoring({ question, update }: EditorProps) {
  useEffect(() => {
    const criteria = (question.settings.criteria as Criterion[] | undefined) ?? [];
    const maxPoints = question.scoringConfig.maxPoints;
    const hasMax = typeof maxPoints === "number" && maxPoints > 0;
    if (criteria.length === 0 && !hasMax) {
      return;
    }
    update({
      settings: { ...question.settings, criteria: [] },
      scoringConfig: { ...question.scoringConfig, maxPoints: 0, manual: true },
    });
  }, [question.id]);

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>Ручная проверка</Text>
      <SettingsHint>
        Ответ проверяет преподаватель и сам выставляет балл. До проверки участник не видит итоговый балл
      </SettingsHint>
    </Stack>
  );
}

export function WrittenAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return <ManualScoring question={question} update={update} />;
  }
  const set = (field: "minWords" | "maxWords", value: number | undefined) => {
    const settings = { ...question.settings };
    if (value === undefined || value === 0) {
      delete settings[field];
    } else {
      settings[field] = value;
    }
    update({ settings });
  };
  return (
    <Stack gap="md">
      <SimpleGrid cols={2} spacing="md">
        <NumberField label="Минимум слов" value={question.settings.minWords} max={5000} onChange={(value) => set("minWords", value)} />
        <NumberField label="Максимум слов" value={question.settings.maxWords} max={5000} onChange={(value) => set("maxWords", value)} />
      </SimpleGrid>
      <ManualScoring question={question} update={update} />
    </Stack>
  );
}
