import { Stack } from "@mantine/core";
import { ScoreField } from "../ScoreField";
import type { EditorProps } from "../types";

export function JudgementAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="pointsPerStatement" label="Баллы за ответ" />
      </Stack>
    );
  }
  return null;
}
