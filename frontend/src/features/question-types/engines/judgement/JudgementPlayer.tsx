import { Box, Radio, Stack, Text } from "@mantine/core";
import type { JudgementOptions } from "@/entities/question/types";
import { judgementLabels } from "../../registry";
import type { PlayerProps } from "../types";

function judgementCaps(label: string) {
  return label.replaceAll("_", " ");
}

export function JudgementPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const statements = (question.options as JudgementOptions).statements ?? [];
  const statement = statements[0];
  const answers = (answer.answers as Record<string, string>) ?? {};
  const options = judgementLabels(question.type);

  if (!statement) {
    return null;
  }

  const selected = answers[statement.id] ?? "";

  return (
    <Stack gap="xs" component="fieldset" style={{ border: 0, margin: 0, padding: 0 }}>
      <Text component="legend" className="sr-only">Options</Text>
      <Stack gap="xs" component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {options.map((value) => (
          <Box key={value} component="li">
            <Radio
              name={`answer-${question.id}-${statement.id}`}
              checked={selected === value}
              disabled={readOnly}
              label={judgementCaps(value)}
              styles={{
                body: { alignItems: "center" },
                label: { fontSize: "var(--type-body, 1rem)", fontWeight: 500, lineHeight: "var(--mantine-line-height-md)" },
              }}
              onChange={() => onAnswer({ answers: { [statement.id]: value } })}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
