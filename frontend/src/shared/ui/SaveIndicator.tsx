import { Group, Text, ThemeIcon } from "@mantine/core";
import { Icon } from "./Icon";

export type SaveState = "idle" | "saving" | "saved" | "error";

const TEXT: Record<SaveState, string> = {
  idle: "Сохранено",
  saving: "Сохранение…",
  saved: "Сохранено",
  error: "Не удалось сохранить",
};

const COLOR: Record<SaveState, string> = {
  idle: "dimmed",
  saving: "iba",
  saved: "teal",
  error: "red",
};

export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <Group gap={4} wrap="nowrap" role="status" aria-live="polite">
      {state === "saved" && (
        <ThemeIcon size="xs" variant="transparent" color="teal">
          <Icon name="check" size={14} />
        </ThemeIcon>
      )}
      {state === "error" && (
        <ThemeIcon size="xs" variant="transparent" color="red">
          <Icon name="warning" size={14} />
        </ThemeIcon>
      )}
      <Text size="sm" c={COLOR[state]} fw={500}>
        {TEXT[state]}
      </Text>
    </Group>
  );
}
