import { Group, Stack, Text, Textarea } from "@mantine/core";
import { countWords } from "@/shared/lib/format";
import type { PlayerProps } from "../types";

export function WrittenPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const text = String(answer.text ?? "");
  const words = countWords(text);
  const { minWords, maxWords } = question.settings;
  const over = Boolean(maxWords && words > maxWords);
  const under = Boolean(minWords && words < minWords);
  const inRange = Boolean((minWords || maxWords) && !over && !under);
  const color = over ? "red" : under ? "yellow.8" : inRange ? "green" : "dimmed";
  const rangeHint = [minWords ? `min ${minWords}` : "", maxWords ? `max ${maxWords}` : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <Stack gap="xs">
      <Textarea
        aria-label="Answer"
        minRows={4}
        autosize
        value={text}
        readOnly={readOnly}
        onChange={(event) => onAnswer({ text: event.target.value })}
      />
      <Group justify="flex-end">
        <Text size="sm" c={color} fw={500} aria-live="polite">
          Words: {words}
          {rangeHint ? ` (${rangeHint})` : ""}
          {over ? " – over the recommended limit" : ""}
          {under && words > 0 ? " – under the recommended minimum" : ""}
        </Text>
      </Group>
    </Stack>
  );
}
