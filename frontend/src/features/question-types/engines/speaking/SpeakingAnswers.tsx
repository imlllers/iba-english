import { Box, Group, Stack } from "@mantine/core";
import { NumberField } from "../../widgets/NumberField";
import type { EditorProps } from "../types";
import { ManualScoring } from "../written/WrittenAnswers";

export function SpeakingAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return <ManualScoring question={question} update={update} />;
  }
  const set = (field: "maxSeconds" | "preparationSeconds", value: number | undefined, fallback: number) =>
    update({ settings: { ...question.settings, [field]: value ?? fallback } });
  return (
    <Stack gap="md">
      <Group gap="md" align="flex-start" grow wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <NumberField
            label="Время ответа, секунды (10-600 секунд)"
            withAsterisk
            value={question.settings.maxSeconds}
            min={10}
            max={600}
            onChange={(value) => set("maxSeconds", value, 120)}
          />
        </Box>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <NumberField
            label="Подготовка, секунды (0 – без подготовки)"
            value={question.settings.preparationSeconds ?? 0}
            max={300}
            onChange={(value) => set("preparationSeconds", value, 0)}
          />
        </Box>
      </Group>
      <ManualScoring question={question} update={update} />
    </Stack>
  );
}
