import { Stack } from "@mantine/core";
import { ScoreField, ScoreToggle } from "../ScoreField";
import type { EditorProps } from "../types";

export function ChoiceAnswers({ question, update, part = "body" }: EditorProps) {
  const multiple = question.type === "MULTIPLE_SELECT";

  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="points" label="Баллы за задание" />
        {multiple && <ScoreToggle question={question} update={update} field="partial" label="Частичные баллы за каждый верный вариант" />}
      </Stack>
    );
  }

  return null;
}
