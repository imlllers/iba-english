import { Stack } from "@mantine/core";
import { ScoreField, ScoreToggle } from "../ScoreField";
import type { EditorProps } from "../types";

export function MatchingAnswers({ question, update, part = "body" }: EditorProps) {
  if (part === "score") {
    return (
      <Stack gap="md">
        <ScoreField question={question} update={update} field="pointsPerPair" label="Баллы за пару" />
        <ScoreToggle question={question} update={update} field="partial" fallback label="Засчитывать каждую верную пару" />
      </Stack>
    );
  }
  return null;
}
