import { Box, Checkbox, Radio, Stack, Text } from "@mantine/core";
import type { Item } from "@/entities/question/types";
import { letter } from "@/shared/lib/format";
import type { PlayerProps } from "../types";

export function ChoicePlayer({ question, answer, onAnswer, readOnly, parenLetters = false }: PlayerProps) {
  const options: Item[] = Array.isArray(question.options) ? question.options : [];
  const multiple = question.type === "MULTIPLE_SELECT";
  const selected = multiple ? ((answer.optionIds as string[]) ?? []) : [String(answer.optionId ?? "")];
  const selectLimit = (() => {
    if (!multiple) {
      return 0;
    }
    const fromSettings = Number(question.settings?.selectCount);
    if (Number.isFinite(fromSettings) && fromSettings > 0) {
      return Math.round(fromSettings);
    }
    const points = Number(question.scoringConfig?.points);
    if (Number.isFinite(points) && points > 1) {
      return Math.round(points);
    }
    return 0;
  })();

  const change = (id: string, checked: boolean) => {
    if (!multiple) {
      onAnswer({ optionId: id });
      return;
    }
    if (checked && selectLimit > 0 && selected.length >= selectLimit && !selected.includes(id)) {
      return;
    }
    const next = checked ? [...selected, id] : selected.filter((value) => value !== id);
    onAnswer({ optionIds: options.map((option) => option.id).filter((value) => next.includes(value)) });
  };

  const label = (index: number, text: string) => (
    <>
      <Text component="span" fw={parenLetters ? 500 : 700} mr="xs">
        {parenLetters ? `(${letter(index)})` : letter(index)}
      </Text>
      <Text component="span" fw={500}>{text}</Text>
    </>
  );

  return (
    <Stack gap="xs" component="fieldset" style={{ border: 0, margin: 0, padding: 0 }}>
      <Text component="legend" className="sr-only">Options</Text>
      <Stack gap="xs" component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {options.map((option, index) => {
          const checked = selected.includes(option.id);
          return (
            <Box key={option.id} component="li">
              {multiple ? (
                <Checkbox
                  checked={checked}
                  disabled={
                    readOnly
                    || (selectLimit > 0 && !checked && selected.length >= selectLimit)
                  }
                  label={label(index, option.text)}
                  styles={{
                    body: { alignItems: "center" },
                    label: { fontSize: "var(--type-body, 1rem)", fontWeight: 500, lineHeight: "var(--mantine-line-height-md)" },
                  }}
                  onChange={(event) => change(option.id, event.currentTarget.checked)}
                />
              ) : (
                <Radio
                  name={`answer-${question.id}`}
                  checked={checked}
                  disabled={readOnly}
                  label={label(index, option.text)}
                  styles={{
                    body: { alignItems: "center" },
                    label: { fontSize: "var(--type-body, 1rem)", fontWeight: 500, lineHeight: "var(--mantine-line-height-md)" },
                  }}
                  onChange={(event) => change(option.id, event.currentTarget.checked)}
                />
              )}
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
