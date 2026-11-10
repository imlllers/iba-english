import { Stack } from "@mantine/core";
import { ScoreField, ScoreToggle } from "../ScoreField";
import type { EditorProps } from "../types";

export function OrderingAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="points" label="Баллы за задание" />
        <ScoreToggle question={question} update={update} field="partial" label="Частичные баллы за элементы на своих местах" />
      </Stack>
    );
  }
  return null;
}
