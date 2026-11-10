import { Alert, Stack, Table, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AuditEvent } from "@/features/admin/adminApi";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { AUDIT_LABELS, ROLE_LABELS, TARGET_LABELS } from "@/shared/lib/labels";
import { useDebounced } from "@/shared/lib/useDebounced";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FilterBar } from "@/shared/ui/FilterBar";
import { Loading } from "@/shared/ui/Loading";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Pagination } from "@/shared/ui/Pagination";
import { COL } from "@/shared/ui/tableCols";
import { TablePanel } from "@/shared/ui/TablePanel";

const SIZE = 30;

function describe(event: AuditEvent) {
  const details = event.details ?? {};
  const parts: string[] = [];
  if (typeof details.email === "string") {
    parts.push(details.email);
  }
  if (typeof details.title === "string") {
    parts.push(`«${details.title}»`);
  }
  if (typeof details.role === "string") {
    parts.push(ROLE_LABELS[details.role] ?? details.role);
  }
  if (typeof details.version === "number" || typeof details.version === "string") {
    parts.push(`версия ${details.version}`);
  }
  return parts.join(" · ");
}

export function AdminAuditPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const search = useDebounced(q.trim());
  const audit = useQuery({
    queryKey: ["audit", { search, page }],
    queryFn: () => adminApi.audit({ q: search, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });
  const items = audit.data?.items ?? [];

  return (
    <Stack gap="sm">
      <PageHeader title="Журнал действий" />

      <FilterBar>
        <TextInput
          label="Поиск"
          style={{ flex: "1 1 240px", maxWidth: 400 }}
          aria-label="Поиск по email или действию"
          placeholder="Email или действие"
          value={q}
          onChange={(event) => {
            setQ(event.currentTarget.value);
            setPage(0);
          }}
        />
      </FilterBar>

      {audit.isLoading && <Loading />}
      {audit.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(audit.error, "Не удалось загрузить журнал")}</Alert>
      )}
      {audit.data && items.length === 0 && (
        <EmptyState title="Записей нет">
          {search ? "Измените запрос" : "Здесь появятся важные действия пользователей"}
        </EmptyState>
      )}
      {items.length > 0 && (
        <TablePanel>
          <Table.ScrollContainer minWidth={COL.datetime + COL.email + COL.title + COL.object}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={COL.datetime}>Когда</Table.Th>
                  <Table.Th w={COL.email}>Кто</Table.Th>
                  <Table.Th w={COL.title}>Действие</Table.Th>
                  <Table.Th w={COL.object}>Объект</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((event) => (
                  <Table.Tr key={event.id}>
                    <Table.Td>{formatDateTime(event.createdAt)}</Table.Td>
                    <Table.Td>{event.actorEmail}</Table.Td>
                    <Table.Td>{AUDIT_LABELS[event.action] ?? event.action}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">{event.targetType ? TARGET_LABELS[event.targetType] ?? event.targetType : "–"}</Text>
                        {describe(event) && <Text size="sm" c="dimmed">{describe(event)}</Text>}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </TablePanel>
      )}
      {audit.data && <Pagination page={page} size={SIZE} total={audit.data.total} onChange={setPage} />}
    </Stack>
  );
}
