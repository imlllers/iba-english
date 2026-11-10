import { ActionIcon, Alert, Button, Group, Popover, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { HeaderSlotContext } from "@/app/layout/headerSlot";
import type { Role, User, UserStatus } from "@/entities/user/types";
import { adminApi } from "@/features/admin/adminApi";
import { CreateInviteDialog } from "@/features/admin/InviteDialogs";
import { CreateUserDialog } from "@/features/admin/UserDialogs";
import { useSession } from "@/features/auth/useSession";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { ROLE_LABELS } from "@/shared/lib/labels";
import { useDebounced } from "@/shared/lib/useDebounced";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Select } from "@/shared/ui/Select";
import { Pagination } from "@/shared/ui/Pagination";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { COL } from "@/shared/ui/tableCols";
import { TablePanel } from "@/shared/ui/TablePanel";

const SIZE = 20;

type Pending =
  | { kind: "status"; user: User; status: UserStatus }
  | { kind: "role"; user: User; role: Role }
  | { kind: "revoke"; inviteId: string };

export function AdminUsersPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const copyInvite = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedInviteId(id);
      window.setTimeout(() => setCopiedInviteId((current) => (current === id ? null : current)), 2000);
    } catch {
      notify.error("Не удалось скопировать. Выделите код и скопируйте вручную");
    }
  };
  const search = useDebounced(q.trim());
  const users = useQuery({
    queryKey: ["admin-users", { search, role, status, page }],
    queryFn: () => adminApi.users({ q: search, role, status, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });
  const invites = useQuery({
    queryKey: ["admin-invites"],
    queryFn: () => adminApi.invites(),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const refreshInvites = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
  };
  const change = useMutation({
    mutationFn: async (action: Pending) => {
      if (action.kind === "status") await adminApi.changeStatus(action.user.id, action.status);
      else if (action.kind === "role") await adminApi.changeRole(action.user.id, action.role);
      else await adminApi.revokeInvite(action.inviteId);
    },
    onSuccess: (_data, action) => {
      setPending(null);
      if (action.kind === "revoke") refreshInvites();
      else refresh();
    },
  });

  const items = users.data?.items ?? [];
  const inviteItems = invites.data ?? [];
  const filtersActive = Boolean(role || status);
  const filtered = Boolean(search || filtersActive);
  const headerSlot = useContext(HeaderSlotContext);

  const searchField = (
    <TextInput
      aria-label="Поиск по имени или email"
      placeholder="Поиск по имени или email"
      value={q}
      w="var(--grid-col-span-3-width)"
      leftSection={<Icon name="search" />}
      leftSectionPointerEvents="none"
      onChange={(event) => {
        setQ(event.currentTarget.value);
        setPage(0);
      }}
    />
  );
  const confirmText = (action: Pending) => {
    if (action.kind === "revoke") {
      return {
        title: "Отозвать приглашение?",
        text: "Код перестанет действовать. Уже созданные аккаунты не изменятся.",
        label: "Отозвать",
        danger: true,
      };
    }
    if (action.kind === "status") {
      return action.status === "BLOCKED"
        ? { title: "Заблокировать пользователя?", text: `${action.user.displayName} не сможет войти. Тесты и результаты сохранятся.`, label: "Заблокировать", danger: true }
        : { title: "Разблокировать пользователя?", text: `${action.user.displayName} снова сможет войти.`, label: "Разблокировать", danger: false };
    }
    return {
      title: "Изменить роль?",
      text: `${action.user.displayName} получит роль «${ROLE_LABELS[action.role]}». Доступные разделы изменятся при следующем запросе.`,
      label: "Изменить роль",
      danger: action.role === "ADMIN",
    };
  };

  return (
    <Stack gap="sm">
      {headerSlot ? createPortal(searchField, headerSlot) : null}
      <PageHeader
        title="Преподаватели"
        actions={
          <Group gap="md" wrap="nowrap">
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
                    label="Роль"
                    value={role}
                    withinPortal={false}
                    onChange={(next) => {
                      setRole(next as Role | "");
                      setPage(0);
                    }}
                    options={[
                      { value: "", label: "Все роли" },
                      { value: "TEACHER", label: "Преподаватели" },
                      { value: "ADMIN", label: "Администраторы" },
                    ]}
                  />
                  <Select
                    size="sm"
                    label="Статус"
                    value={status}
                    withinPortal={false}
                    onChange={(next) => {
                      setStatus(next as UserStatus | "");
                      setPage(0);
                    }}
                    options={[
                      { value: "", label: "Все статусы" },
                      { value: "ACTIVE", label: "Активные" },
                      { value: "BLOCKED", label: "Заблокированные" },
                    ]}
                  />
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    disabled={!filtersActive}
                    style={{ alignSelf: "flex-end" }}
                    onClick={() => {
                      setRole("");
                      setStatus("");
                      setPage(0);
                    }}
                  >
                    Сбросить фильтр
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Button leftSection={<Icon name="plus" />} onClick={() => setCreating(true)}>
              Добавить
            </Button>
          </Group>
        }
      />

      <SettingsCard>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
            <Stack gap={6}>
              <SettingsSectionTitle>Активные приглашения</SettingsSectionTitle>
              <SettingsHint>Код действует до срока или отзыва. После регистрации приглашение исчезает из списка</SettingsHint>
            </Stack>
            <Button leftSection={<Icon name="plus" />} variant="default" style={{ flex: "none" }} onClick={() => setInviting(true)}>
              Приглашение
            </Button>
          </Group>
          {invites.isLoading && <Loading />}
          {invites.isError && (
            <Alert color="red" variant="light" role="alert">{errorMessage(invites.error, "Не удалось загрузить приглашения")}</Alert>
          )}
          {invites.data && inviteItems.length === 0 && (
            <SettingsHint>Создайте код и передайте его преподавателю</SettingsHint>
          )}
          {inviteItems.length > 0 && (
            <Table.ScrollContainer minWidth={COL.name + COL.datetime + COL.datetime + COL.actionWide}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={COL.name}>Код</Table.Th>
                    <Table.Th w={COL.datetime} ta="center">Создано</Table.Th>
                    <Table.Th w={COL.datetime} ta="center">Действует до</Table.Th>
                    <Table.Th w={COL.actionWide} ta="center">Действие</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {inviteItems.map((invite) => (
                    <Table.Tr key={invite.id}>
                      <Table.Td>
                        {invite.code ? (
                          <Group gap="xs" wrap="nowrap">
                            <Text ff="monospace" style={{ letterSpacing: "0.08em" }}>{invite.code}</Text>
                            <ActionIcon
                              variant="subtle"
                              color={copiedInviteId === invite.id ? "teal" : "gray"}
                              aria-label={copiedInviteId === invite.id ? "Код скопирован" : "Копировать код"}
                              onClick={() => void copyInvite(invite.id, invite.code!)}
                            >
                              <Icon name={copiedInviteId === invite.id ? "check" : "copy"} />
                            </ActionIcon>
                          </Group>
                        ) : "–"}
                      </Table.Td>
                      <Table.Td fz="md" ta="center">{formatDateTime(invite.createdAt)}</Table.Td>
                      <Table.Td fz="md" ta="center">{formatDateTime(invite.expiresAt)}</Table.Td>
                      <Table.Td ta="center">
                        <Button variant="subtle" color="red" onClick={() => setPending({ kind: "revoke", inviteId: invite.id })}>
                          Отозвать
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Stack>
      </SettingsCard>

      {users.isLoading && <Loading />}
      {users.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(users.error, "Не удалось загрузить пользователей")}</Alert>
      )}
      {users.data && items.length === 0 && (
        filtered
          ? <EmptyState title="Никого не найдено">Измените запрос или фильтры</EmptyState>
          : (
            <EmptyState
              title="Пользователей пока нет"
              action={
                <Group gap="md">
                  <Button leftSection={<Icon name="plus" />} variant="default" onClick={() => setInviting(true)}>
                    Приглашение
                  </Button>
                  <Button leftSection={<Icon name="plus" />} onClick={() => setCreating(true)}>
                    Добавить
                  </Button>
                </Group>
              }
            >
              Создайте учётную запись или выдайте код приглашения
            </EmptyState>
          )
      )}
      {items.length > 0 && (
        <TablePanel>
          <Table.ScrollContainer minWidth={COL.name + COL.role + COL.status + COL.datetime + COL.actionWide}>
            <Table layout="fixed">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="30%">Пользователь</Table.Th>
                  <Table.Th w="20%">Роль</Table.Th>
                  <Table.Th w="10%" ta="center">Статус</Table.Th>
                  <Table.Th w="20%" ta="center">Последний вход</Table.Th>
                  <Table.Th w="20%" ta="center">Действие</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((user) => {
                  const self = user.id === session.data?.id;
                  return (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={600}>
                            {user.displayName}
                            {self && (
                              <Text span size="sm" c="dimmed" fw={500}> · это вы</Text>
                            )}
                          </Text>
                          <Text size="sm" c="dimmed">{user.email}</Text>
                          {!user.emailVerified && (
                            <Text size="sm" c="dimmed">Email не подтверждён</Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Select
                          ariaLabel={`Роль пользователя ${user.displayName}`}
                          styles={{ input: { background: "transparent" } }}
                          value={user.role}
                          disabled={self}
                          onChange={(next) => setPending({ kind: "role", user, role: next as Role })}
                          options={[
                            { value: "TEACHER", label: ROLE_LABELS.TEACHER },
                            { value: "ADMIN", label: ROLE_LABELS.ADMIN },
                          ]}
                        />
                      </Table.Td>
                      <Table.Td ta="center"><StatusBadge status={user.status} /></Table.Td>
                      <Table.Td ta="center" fz="md">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Не входил"}</Table.Td>
                      <Table.Td ta="center">
                        {!self && (user.status === "ACTIVE" ? (
                          <Button variant="subtle" color="red" onClick={() => setPending({ kind: "status", user, status: "BLOCKED" })}>
                            Заблокировать
                          </Button>
                        ) : (
                          <Button variant="subtle" onClick={() => setPending({ kind: "status", user, status: "ACTIVE" })}>
                            Разблокировать
                          </Button>
                        ))}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </TablePanel>
      )}
      {users.data && <Pagination page={page} size={SIZE} total={users.data.total} onChange={setPage} />}


      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onCreated={() => {
        setCreating(false);
        refresh();
      }} />
      <CreateInviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onCreated={() => refreshInvites()}
      />
      {pending && (() => {
        const text = confirmText(pending);
        return (
          <ConfirmDialog
            open
            title={text.title}
            confirmLabel={text.label}
            danger={text.danger}
            busy={change.isPending}
            error={change.isError ? errorMessage(change.error, "Не удалось") : undefined}
            onConfirm={() => change.mutate(pending)}
            onClose={() => {
              setPending(null);
              change.reset();
            }}
          >
            {text.text}
          </ConfirmDialog>
        );
      })()}
    </Stack>
  );
}
