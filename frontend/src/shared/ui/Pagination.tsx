import { ActionIcon, Group, Text } from "@mantine/core";
import type { MouseEvent } from "react";
import { Icon } from "./Icon";

type PaginationProps = {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, size, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) {
    return null;
  }
  const go = (next: number, event: MouseEvent<HTMLButtonElement>) => {
    onChange(next);
    const modal = event.currentTarget.closest(".mantine-Modal-content");
    if (modal) modal.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <Group component="nav" justify="center" gap="md" pt="md" aria-label="Страницы">
      <ActionIcon
        variant="default"
        size="lg"
        disabled={page === 0}
        aria-label="Предыдущая страница"
        onClick={(event) => go(page - 1, event)}
      >
        <Icon name="back" />
      </ActionIcon>
      <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        Страница {page + 1} из {pages}
      </Text>
      <ActionIcon
        variant="default"
        size="lg"
        disabled={page + 1 >= pages}
        aria-label="Следующая страница"
        onClick={(event) => go(page + 1, event)}
      >
        <Icon name="chevron" />
      </ActionIcon>
    </Group>
  );
}
