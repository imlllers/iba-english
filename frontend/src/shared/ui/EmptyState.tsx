import { Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { SettingsHint } from "@/shared/ui/SettingsHint";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Paper
      radius="md"
      shadow="sm"
      px="md"
      py={48}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack gap="sm" align="center" ta="center" maw={420}>
        <Text size="lg" fw={700} lh="var(--mantine-line-height-lg)">
          {title}
        </Text>
        {children && <SettingsHint ta="center">{children}</SettingsHint>}
        {action}
      </Stack>
    </Paper>
  );
}
