import { Alert, Button, Group, Modal, MultiSelect, Stack, Text, Textarea } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { TestSummary } from "@/entities/test/types";
import { errorMessage } from "@/shared/api/client";
import { useDebounced } from "@/shared/lib/useDebounced";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { notify } from "@/shared/ui/notify";
import { shareApi, type ColleagueSummary } from "./shareApi";

export function ShareTestDialog({
  test,
  onClose,
}: {
  test: TestSummary;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [selected, setSelected] = useState<string[]>([]);
  const [known, setKnown] = useState<Record<string, ColleagueSummary>>({});
  const [comment, setComment] = useState("");
  const colleagues = useQuery({
    queryKey: ["colleagues", q],
    queryFn: () => shareApi.colleagues(q),
    staleTime: 30_000,
  });
  const send = useMutation({
    mutationFn: () => shareApi.share(test.id, selected, comment.trim() || undefined),
    onSuccess: () => {
      notify.success("Тест отправлен");
      onClose();
    },
  });

  useEffect(() => {
    setSearch("");
    setSelected([]);
    setKnown({});
    setComment("");
  }, [test.id]);

  const items = colleagues.data?.items ?? [];

  useEffect(() => {
    if (items.length === 0) return;
    setKnown((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.id] = item;
      }
      return next;
    });
  }, [items]);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];
    for (const item of items) {
      seen.add(item.id);
      list.push({ value: item.id, label: item.displayName });
    }
    for (const id of selected) {
      if (!seen.has(id) && known[id]) {
        list.push({ value: id, label: known[id].displayName });
      }
    }
    return list;
  }, [items, known, selected]);

  return (
    <Modal opened onClose={onClose} title="Поделиться тестом" centered>
      <Stack gap="md">
        <MultiSelect
          label="Коллеги"
          size="md"
          withAsterisk
          placeholder="Выберите коллег"
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          value={selected}
          onChange={setSelected}
          data={options}
          nothingFoundMessage="Никого не найдено"
          maxDropdownHeight={280}
          comboboxProps={{ withinPortal: true }}
          renderOption={({ option, checked }) => {
            const colleague = known[option.value];
            return (
              <Group gap="md" wrap="nowrap" flex={1}>
                {colleague ? (
                  <UserAvatar user={{ displayName: colleague.displayName, avatar: colleague.avatar }} size={28} />
                ) : null}
                <Text size="md" fw={checked ? 600 : 500} lh="var(--mantine-line-height-md)">
                  {option.label}
                </Text>
              </Group>
            );
          }}
        />
        <Textarea
          label="Комментарий"
          placeholder="Необязательно"
          value={comment}
          onChange={(event) => setComment(event.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={5}
        />
        {send.isError && <Alert color="red">{errorMessage(send.error, "Не удалось отправить")}</Alert>}
        <Button
          disabled={selected.length === 0}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          Отправить
        </Button>
      </Stack>
    </Modal>
  );
}