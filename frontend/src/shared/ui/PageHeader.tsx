import { Group, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  caption?: ReactNode;
  actions?: ReactNode;
}) {
  const actionRow = actions ? (
    <Group gap="md" wrap="nowrap" justify="flex-end" align="center">
      {actions}
    </Group>
  ) : null;

  return (
    <Group
      component="header"
      justify="space-between"
      align="center"
      gap="md"
      wrap="nowrap"
      mih={43}
    >
      <Title
        order={2}
        fz={30}
        lh="36px"
        style={{ margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {title}
      </Title>
      {actionRow}
    </Group>
  );
}
