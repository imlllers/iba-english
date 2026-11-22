import { Stack, Text } from "@mantine/core";
import type { Doc } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { toInstructionDoc } from "../content/instructionDoc";
import { RichTextEditor } from "../prompt/RichTextEditor";

type InstructionsFieldProps = {
  value: unknown;
  label?: string;
  description?: string;
  placeholder?: string;
  onChange: (doc: Doc) => void;
  toolbar?: "host" | "inline";
  blankTools?: boolean;
};

export function InstructionsField({
  value,
  label = "Инструкция",
  description,
  onChange,
  toolbar = "host",
  blankTools = true,
}: InstructionsFieldProps) {
  return (
    <Stack gap="xs">
      <Stack gap={4}>
        <Text size="sm" fw={600}>{label}</Text>
        {description ? <SettingsHint>{description}</SettingsHint> : null}
      </Stack>
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
