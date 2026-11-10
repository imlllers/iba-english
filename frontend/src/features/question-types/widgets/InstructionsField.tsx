import { Stack, Text } from "@mantine/core";
import type { Doc } from "@/entities/question/types";
import { toInstructionDoc } from "../content/instructionDoc";
import { RichTextEditor } from "../prompt/RichTextEditor";

type InstructionsFieldProps = {
  value: unknown;
  label?: string;
  placeholder?: string;
  onChange: (doc: Doc) => void;
  toolbar?: "host" | "inline";
  blankTools?: boolean;
};

export function InstructionsField({
  value,
  label = "Инструкция",
  onChange,
  toolbar = "host",
  blankTools = true,
}: InstructionsFieldProps) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>{label}</Text>
      <RichTextEditor
        label={label}
        mode="plain"
        value={toInstructionDoc(value)}
        onChange={onChange}
        toolbar={toolbar}
        blankTools={blankTools}
      />
    </Stack>
  );
}
