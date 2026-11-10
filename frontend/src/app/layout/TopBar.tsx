import { Box, Group } from "@mantine/core";
import { useContext } from "react";
import { SetActionsSlotContext, SetTitleSlotContext } from "./titleSlot";

export function TopBar({ showLogout: _showLogout = true }: { showLogout?: boolean; compact?: boolean }) {
  const setTitleSlot = useContext(SetTitleSlotContext);
  const setActionsSlot = useContext(SetActionsSlotContext);

  return (
    <Group h="100%" gap="md" wrap="nowrap" justify="space-between">
      <Box ref={setTitleSlot} style={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }} className="topbar-title" />
      <Group gap="md" wrap="nowrap" justify="flex-end" align="center" ref={setActionsSlot} className="topbar-actions" />
      <style>{`
        .topbar-title :is(h1, h2) {
          margin: 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .topbar-actions:empty { display: none; }
        .topbar-actions { flex: none; }
      `}</style>
    </Group>
  );
}
