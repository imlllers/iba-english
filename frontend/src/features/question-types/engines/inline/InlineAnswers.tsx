import { Stack } from "@mantine/core";
import { ScoreField } from "../ScoreField";
import type { EditorProps } from "../types";

export function InlineAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="pointsPerBlank" label="Баллы за пропуск" />
      </Stack>
    );
  }
  return null;
}
