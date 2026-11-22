import { Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { SettingsHint } from "@/shared/ui/SettingsHint";

export function EmptyState({
  title,
  children,
  action,
  muted,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}) {
  return (
    <Paper
      radius="md"
      shadow="sm"
      px="md"
      py={48}
      w="100%"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack gap="sm" align="center" ta="center" maw={420}>
        {muted ? (
          <Text size="sm" c="dimmed" fw={500} lh="var(--mantine-line-height-sm)">
            {title}
          </Text>
        ) : (
          <Text size="lg" fw={700} lh="var(--mantine-line-height-lg)">
            {title}
          </Text>
        )}
        {children && (muted ? (
          <Text size="sm" c="dimmed" fw={500} ta="center" lh="var(--mantine-line-height-sm)">
            {children}
          </Text>
        ) : (
          <SettingsHint ta="center">{children}</SettingsHint>
        ))}
        {action}
      </Stack>
    </Paper>
  );
}
