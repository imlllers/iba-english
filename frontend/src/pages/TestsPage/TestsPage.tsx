import { Alert, Button, Group, Popover, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { ACCESS_DATES_ENABLED, DISABLED_SUFFIX } from "@/entities/test/settings";
import { HeaderSlotContext } from "@/app/layout/headerSlot";
import type { AccessStatus, TestSummary } from "@/entities/test/types";
import { CreateTestDialog } from "@/features/tests/CreateTestDialog";
import { publicLink } from "@/features/tests/publicLink";
import { testsApi } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { useDebounced } from "@/shared/lib/useDebounced";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { IconButton } from "@/shared/ui/IconButton";
import { Loading } from "@/shared/ui/Loading";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Select } from "@/shared/ui/Select";
import { Pagination } from "@/shared/ui/Pagination";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { COL } from "@/shared/ui/tableCols";
import { TablePanel } from "@/shared/ui/TablePanel";
import { notify } from "@/shared/ui/notify";

const SIZE = 20;

export function TestsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState(params.get("q") ?? "");
  const search = useDebounced(q.trim());
  const status = (params.get("status") ?? "") as AccessStatus | "";
  const examPreset = params.get("examPreset") ?? "";
  const page = Number(params.get("page") ?? 0);
  const [removing, setRemoving] = useState<TestSummary | null>(null);
  const [linkAction, setLinkAction] = useState<{ kind: "rotate" | "revoke"; test: TestSummary } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const presets = useQuery({ queryKey: ["presets"], queryFn: testsApi.presets, staleTime: 60_000 });
  const list = useQuery({
    queryKey: ["tests", { search, status, examPreset, page }],
    queryFn: () => testsApi.list({ q: search, status, examPreset: examPreset || undefined, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") {
      next.delete("page");
    }
    setParams(next, { replace: true });
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tests"] });
  };

  const action = useMutation({
    mutationFn: async ({ kind, test }: { kind: "duplicate" | "remove" | "rotate" | "revoke"; test: TestSummary }) => {
      if (kind === "duplicate") {
        return testsApi.duplicate(test.id);
      }
      if (kind === "remove") {
        await testsApi.remove(test.id);
        return null;
      }
      if (kind === "rotate") {
        return testsApi.rotateLink(test.id);
      }
      return testsApi.revokeLink(test.id);
    },
    onSuccess: (_result, { kind }) => {
      setRemoving(null);
      setLinkAction(null);
      refresh();
      if (kind === "duplicate") {
        notify.success("Копия теста создана");
      } else if (kind === "remove") {
        notify.success("Тест удалён");
      } else if (kind === "rotate") {
        notify.success("Ссылка заменена");
      } else if (kind === "revoke") {
        notify.success("Ссылка отозвана");
      }
    },
  });
  const actionNow = (kind: "duplicate" | "rotate", test: TestSummary) =>
    action.mutate({ kind, test }, { onError: (error) => notify.error(errorMessage(error, "Действие не выполнено")) });

  const copyLink = async (test: TestSummary) => {
    if (!test.publicToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publicLink(test.publicToken));
      setCopiedId(test.id);
      window.setTimeout(() => setCopiedId((current) => (current === test.id ? null : current)), 2000);
    } catch {
      notify.error("Не удалось скопировать. Выделите ссылку и скопируйте вручную");
    }
  };

  const items = list.data?.items ?? [];
  const filtersActive = Boolean(status || examPreset);
  const filtered = Boolean(search || filtersActive);
  const headerSlot = useContext(HeaderSlotContext);

  const searchField = (
    <TextInput
      aria-label="Поиск по названию"
      placeholder="Поиск по названию"
      value={q}
      w="var(--grid-col-span-3-width)"
      leftSection={<Icon name="search" />}
      leftSectionPointerEvents="none"
      onChange={(event) => {
        setQ(event.currentTarget.value);
        setParam("q", event.currentTarget.value.trim());
      }}
    />
  );

  return (
    <Stack gap="sm">
      {headerSlot ? createPortal(searchField, headerSlot) : null}
      <PageHeader
        title="Созданные тесты"
        actions={
          <>
            <Popover width={280} position="bottom-end" shadow="md">
              <Popover.Target>
                <Button
                  variant={filtersActive ? "light" : "subtle"}
                  color={filtersActive ? "iba" : "gray"}
                  leftSection={<Icon name="filter" />}
                >
                  Фильтр
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Select
                    size="sm"
                    label="Статус"
                    value={status}
                    withinPortal={false}
                    onChange={(next) => setParam("status", next)}
                    options={[
                      { value: "", label: "Все" },
                      { value: "DRAFT", label: "Черновик" },
                      { value: "SCHEDULED", label: ACCESS_DATES_ENABLED ? "Запланирован" : "Запланирован" + DISABLED_SUFFIX, disabled: !ACCESS_DATES_ENABLED },
                      { value: "OPEN", label: "Доступ открыт" },
                      { value: "CLOSED", label: "Доступ закрыт" },
                    ]}
                  />
                  <Select
                    size="sm"
                    label="Тип"
                    value={examPreset}
                    withinPortal={false}
                    onChange={(next) => setParam("examPreset", next)}
                    options={[
                      { value: "", label: "Все типы" },
                      { value: "__none__", label: "Пустой тест" },
                      ...(presets.data?.map((item) => ({ value: item.id, label: item.title })) ?? []),
                    ]}
                  />
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    disabled={!filtersActive}
                    style={{ alignSelf: "flex-end" }}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.delete("status");
                      next.delete("examPreset");
                      next.delete("page");
                      setParams(next, { replace: true });
                    }}
                  >
                    Сбросить фильтр
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Button leftSection={<Icon name="plus" />} onClick={() => setParam("create", "1")}>
              Создать тест
            </Button>
          </>
        }
      />

      {list.isLoading && <Loading />}
      {list.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(list.error, "Не удалось загрузить тесты")}</Alert>
      )}
      {list.data && items.length === 0 && (
        filtered
          ? <EmptyState title="Ничего не найдено">Измените запрос или фильтр статуса</EmptyState>
          : (
            <EmptyState title="Тестов пока нет">
              Создайте тест с нуля или по шаблону структуры
            </EmptyState>
          )
      )}
      {items.length > 0 && (
        <TablePanel>
          <Table.ScrollContainer minWidth={COL.title + COL.type + COL.status + COL.count + COL.datetime + COL.link + COL.action}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={COL.title}>Название</Table.Th>
                  <Table.Th w={COL.type} ta="center">Тип</Table.Th>
                  <Table.Th w={COL.status} ta="center">Статус</Table.Th>
                  <Table.Th w={COL.count} ta="center">Заданий</Table.Th>
                  <Table.Th w={COL.datetime} ta="center">Изменён</Table.Th>
                  <Table.Th w={COL.link} ta="center">Ссылка</Table.Th>
                  <Table.Th w={COL.action} ta="center">Действие</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((test) => (
                  <Table.Tr key={test.id}>
                    <Table.Td>
                      <Text component={Link} to={`/teacher/tests/${test.id}`} target="_blank" rel="noopener noreferrer" fw={600} c="iba">
                        {test.title}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center" fz="md">{test.examPreset ? test.examPreset.replaceAll("_", " ") : "–"}</Table.Td>
                    <Table.Td ta="center">
                      <Stack gap={0} align="center">
                        <StatusBadge status={test.accessStatus ?? test.status} />
                        {test.hasUnpublishedChanges && <Text fz="xs" c="dimmed">есть изменения</Text>}
                      </Stack>
                    </Table.Td>
                    <Table.Td ta="center" fz="md">{test.questionCount}</Table.Td>
                    <Table.Td ta="center" fz="md">{formatDateTime(test.updatedAt)}</Table.Td>
                    <Table.Td ta="center">
                      <ParticipantLink
                        test={test}
                        copied={copiedId === test.id}
                        pending={action.isPending}
                        onCopy={() => void copyLink(test)}
                        onRotate={() => setLinkAction({ kind: "rotate", test })}
                        onRevoke={() => setLinkAction({ kind: "revoke", test })}
                        onCreate={() => actionNow("rotate", test)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="md" wrap="nowrap" justify="center">
                        <IconButton
                          size="lg"
                          label="Копировать тест"
                          aria-label={`Копировать тест «${test.title}»`}
                          disabled={action.isPending}
                          onClick={() => actionNow("duplicate", test)}
                        >
                          <Icon name="copy" size={20} />
                        </IconButton>
                        <IconButton
                          size="lg"
                          color="red"
                          label="Удалить тест"
                          aria-label={`Удалить тест «${test.title}»`}
                          onClick={() => setRemoving(test)}
                        >
                          <Icon name="trash" size={20} />
                        </IconButton>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </TablePanel>
      )}
      {list.data && <Pagination page={page} size={SIZE} total={list.data.total} onChange={(next) => setParam("page", String(next))} />}
      <CreateTestDialog open={params.get("create") === "1"} onClose={() => setParam("create", "")} />
      {linkAction && (
        <ConfirmDialog
          open
          title={linkAction.kind === "rotate" ? "Заменить ссылку?" : "Отозвать ссылку?"}
          confirmLabel={linkAction.kind === "rotate" ? "Заменить ссылку" : "Отозвать"}
          danger={linkAction.kind === "revoke"}
          busy={action.isPending}
          error={action.isError ? errorMessage(action.error, "Не удалось") : undefined}
          onConfirm={() => action.mutate({ kind: linkAction.kind, test: linkAction.test })}
          onClose={() => {
            setLinkAction(null);
            action.reset();
          }}
        >
          {linkAction.kind === "rotate"
            ? "Старая ссылка перестанет работать. Участникам нужно будет отправить новую."
            : "Тест станет недоступен по ссылке. Новые попытки начать будет нельзя."}
        </ConfirmDialog>
      )}
      {removing && (
        <ConfirmDialog
          open
          title="Удалить тест?"
          confirmLabel="Удалить"
          danger
          busy={action.isPending}
          error={action.isError ? errorMessage(action.error, "Не удалось удалить") : undefined}
          onConfirm={() => action.mutate({ kind: "remove", test: removing })}
          onClose={() => {
            setRemoving(null);
            action.reset();
          }}
        >
          Тест «{removing.title}» будет удалён вместе с заданиями, ссылкой и результатами попыток. Это нельзя отменить.
        </ConfirmDialog>
      )}
    </Stack>
  );
}

function linkOpen(test: TestSummary) {
  if (test.status !== "PUBLISHED" || !test.publicToken) {
    return false;
  }
  if (!test.publicTokenExpiresAt) {
    return true;
  }
  return new Date(test.publicTokenExpiresAt).getTime() > Date.now();
}

function ParticipantLink({ test, copied, pending, onCopy, onRotate, onRevoke, onCreate }: {
  test: TestSummary;
  copied: boolean;
  pending: boolean;
  onCopy: () => void;
  onRotate: () => void;
  onRevoke: () => void;
  onCreate: () => void;
}) {
  if (test.status !== "PUBLISHED") {
    return <Text fz="inherit" c="dimmed">–</Text>;
  }
  if (!linkOpen(test)) {
    const renew = Boolean(test.publicToken);
    return (
      <Group gap="xs" wrap="nowrap" justify="center">
        <Text fz="sm" c="dimmed">{renew ? "Срок истёк" : "Нет ссылки"}</Text>
        <IconButton
          size="lg"
          label={renew ? "Заменить ссылку" : "Создать ссылку"}
          disabled={pending}
          onClick={renew ? onRotate : onCreate}
        >
          <Icon name={renew ? "refresh" : "link"} size={20} />
        </IconButton>
      </Group>
    );
  }
  return (
    <Stack gap={0} align="center">
      <Group gap="md" wrap="nowrap" justify="center">
        <IconButton size="lg" label="Копировать ссылку" tooltip={copied ? "Скопировано" : "Копировать ссылку"} onClick={onCopy}>
          <Icon name={copied ? "check" : "copy"} size={20} />
        </IconButton>
        <IconButton size="lg" label="Заменить ссылку" onClick={onRotate}>
          <Icon name="refresh" size={20} />
        </IconButton>
        <IconButton size="lg" color="red" label="Отозвать ссылку" onClick={onRevoke}>
          <Icon name="trash" size={20} />
        </IconButton>
      </Group>
      {test.publicTokenExpiresAt && (
        <Text fz="xs" c="dimmed">до {formatDateTime(test.publicTokenExpiresAt)}</Text>
      )}
    </Stack>
  );
}
