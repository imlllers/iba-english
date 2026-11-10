import { Paper } from "@mantine/core";
import type { ReactNode } from "react";

export function TablePanel({ children }: { children: ReactNode }) {
  return (
    <Paper
      radius="md"
      shadow="sm"
      p={0}
      className="iba-table-panel"
      styles={{ root: { overflow: "hidden" } }}
    >
      {children}
      <style>{`
        .iba-table-panel .mantine-TableScrollContainer-scrollContainer,
        .iba-table-panel .mantine-ScrollArea-root,
        .iba-table-panel .mantine-ScrollArea-viewport,
        .iba-table-panel .mantine-TableScrollContainer-scrollContainerInner {
          border-radius: inherit;
        }
      `}</style>
    </Paper>
  );
}
