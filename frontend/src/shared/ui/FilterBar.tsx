import { Group, Paper } from "@mantine/core";
import type { ReactNode } from "react";

const FILTER_BAR_HEIGHT = 43 * 2 + 4;

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      radius="md"
      shadow="sm"
      style={{
        height: FILTER_BAR_HEIGHT,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Group gap="md" wrap="wrap" align="flex-end" w="100%">
        {children}
      </Group>
    </Paper>
  );
}
