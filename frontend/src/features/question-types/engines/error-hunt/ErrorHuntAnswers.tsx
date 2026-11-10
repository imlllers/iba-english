import { Stack } from "@mantine/core";
import { ScoreField } from "../ScoreField";
import type { EditorProps } from "../types";

export function ErrorHuntAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="pointsPerError" label="Баллы за ошибку" />
      </Stack>
    );
  }
  return null;
}
