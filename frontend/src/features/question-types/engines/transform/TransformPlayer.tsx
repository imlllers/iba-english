import { Group, Stack, Text, TextInput } from "@mantine/core";
import type { TransformOptions } from "@/entities/question/types";
import type { PlayerProps } from "../types";

const keywordStyle = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 10px",
  border: "1px solid var(--mantine-color-iba-6)",
  borderRadius: "var(--mantine-radius-sm)",
  color: "var(--mantine-color-iba-8)",
  fontWeight: 700,
  letterSpacing: "0.04em",
} as const;

export function TransformPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const options = question.options as TransformOptions;
  const value = String(answer.text ?? "");
  return (
    <Stack gap="md">
      <Group gap="xs">
        <Text c="dimmed" fw={500}>Word:</Text>
        <Text component="span" style={keywordStyle}>{options.source?.toUpperCase()}</Text>
      </Group>
      <TextInput
        aria-label="Answer"
        value={value}
        readOnly={readOnly}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onAnswer({ text: event.target.value })}
      />
    </Stack>
  );
}
