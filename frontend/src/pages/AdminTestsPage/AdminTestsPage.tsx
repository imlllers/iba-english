import { Alert, Button, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ACCESS_DATES_ENABLED, DISABLED_SUFFIX } from "@/entities/test/settings";
import type { AccessStatus, TestSummary } from "@/entities/test/types";
import { adminApi } from "@/features/admin/adminApi";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { useDebounced } from "@/shared/lib/useDebounced";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FilterBar } from "@/shared/ui/FilterBar";
import { Loading } from "@/shared/ui/Loading";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Select } from "@/shared/ui/Select";
import { Pagination } from "@/shared/ui/Pagination";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { COL } from "@/shared/ui/tableCols";
import { TablePanel } from "@/shared/ui/TablePanel";

const SIZE = 20;

export function AdminTestsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [removing, setRemoving] = useState<TestSummary | null>(null);
  const status = (params.get("status") ?? "") as AccessStatus | "";
  const search = useDebounced(q.trim());
  const tests = useQuery({
    queryKey: ["admin-tests", { search, status, page }],
    queryFn: () => adminApi.tests({ q: search, status, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });
  const remove = useMutation({
    mutationFn: (test: TestSummary) => adminApi.deleteTest(test.id),
    onSuccess: () => {
      setRemoving(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-tests"] });
    },
  });
  const items = tests.data?.items ?? [];
  const filtered = Boolean(search || status);

  return (
    <Stack gap="sm">
      <PageHeader title="Тесты" />

      <FilterBar>
        <TextInput
          label="Поиск"
          aria-label="Поиск по названию или автору"
          placeholder="Название или автор"
          value={q}
          style={{ flex: "1 1 240px", maxWidth: 360 }}
          onChange={(event) => {
            setQ(event.currentTarget.value);
            setPage(0);
          }}
        />
        <Select
          label="Статус"
          value={status}
          onChange={(next) => {
            setParams(next ? { status: next } : {}, { replace: true });
            setPage(0);
          }}
          options={[
            { value: "", label: "Все статусы" },
            { value: "DRAFT", label: "Черновик" },
            { value: "SCHEDULED", label: ACCESS_DATES_ENABLED ? "Запланирован" : "Запланирован" + DISABLED_SUFFIX, disabled: !ACCESS_DATES_ENABLED },
            { value: "OPEN", label: "Доступ открыт" },
            { value: "CLOSED", label: "Доступ закрыт" },
          ]}
        />
      </FilterBar>

      {tests.isLoading && <Loading />}
      {tests.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(tests.error, "Не удалось загрузить тесты")}</Alert>
      )}
      {tests.data && items.length === 0 && (
        <EmptyState title={filtered ? "Тестов не найдено" : "Тестов пока нет"}>
          {filtered ? "Измените запрос или фильтр" : "Здесь появятся тесты преподавателей"}
        </EmptyState>
      )}
      {items.length > 0 && (
        <TablePanel>
          <Table.ScrollContainer minWidth={COL.title + COL.author + COL.status + COL.count + COL.datetime + COL.actionWide}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={COL.title}>Название</Table.Th>
                  <Table.Th w={COL.author}>Автор</Table.Th>
                  <Table.Th w={COL.status}>Статус</Table.Th>
                  <Table.Th w={COL.count} ta="center">Заданий</Table.Th>
                  <Table.Th w={COL.datetime} ta="center">Изменён</Table.Th>
                  <Table.Th w={COL.actionWide}>Действие</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((test) => (
                  <Table.Tr key={test.id}>
                    <Table.Td><Text fw={600}>{test.title}</Text></Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text>{test.ownerName ?? "–"}</Text>
                        <Text size="sm" c="dimmed">{test.ownerEmail}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td><StatusBadge status={test.accessStatus ?? test.status} /></Table.Td>
                    <Table.Td ta="center">{test.questionCount}</Table.Td>
                    <Table.Td ta="center">{formatDateTime(test.updatedAt)}</Table.Td>
                    <Table.Td>
                      <Button variant="subtle" color="red" onClick={() => setRemoving(test)}>Удалить</Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </TablePanel>
      )}
      {tests.data && <Pagination page={page} size={SIZE} total={tests.data.total} onChange={setPage} />}
      {removing && (
        <ConfirmDialog
          open
          title="Удалить тест?"
          confirmLabel="Удалить"
          danger
          busy={remove.isPending}
          error={remove.isError ? errorMessage(remove.error, "Не удалось удалить") : undefined}
          onConfirm={() => remove.mutate(removing)}
          onClose={() => {
            setRemoving(null);
            remove.reset();
          }}
        >
          Тест «{removing.title}» будет удалён вместе с заданиями, ссылкой и результатами. Действие попадёт в журнал и его нельзя отменить.
        </ConfirmDialog>
      )}
    </Stack>
  );
}
