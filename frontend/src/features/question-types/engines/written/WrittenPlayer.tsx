import type { CSSProperties } from "react";
import { Box, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { countWords } from "@/shared/lib/format";
import { PasswordVisibilityIcon } from "@/shared/ui/PasswordVisibilityIcon";
import type { PlayerProps } from "../types";

export function WrittenPlayer({
  question,
  answer,
  onAnswer,
  readOnly,
  hideWordCount,
  showWordCountToggle,
  onToggleWordCount,
}: PlayerProps) {
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
  const wordCountVisible = !hideWordCount;
  const toggle = Boolean(showWordCountToggle && onToggleWordCount);

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
      {toggle || wordCountVisible ? (
        <Group justify="flex-end" gap="md" wrap="nowrap">
          {wordCountVisible ? (
            <Text size="sm" c={color} fw={500} aria-live="polite">
              Words: {words}
              {rangeHint ? ` (${rangeHint})` : ""}
            </Text>
          ) : null}
          {toggle ? (
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={onToggleWordCount}
              aria-label={wordCountVisible ? "Hide word count" : "Show word count"}
              aria-pressed={!wordCountVisible}
              leftSection={(
                <Box component="span" style={{ display: "flex", "--psi-icon-size": "16px" } as CSSProperties}>
                  <PasswordVisibilityIcon reveal={!wordCountVisible} />
                </Box>
              )}
              styles={{ root: { fontWeight: 600 } }}
            >
              {wordCountVisible ? "Hide Word Count" : "Show Word Count"}
            </Button>
          ) : null}
        </Group>
      ) : null}
    </Stack>
  );
}