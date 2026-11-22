import { ActionIcon, Box, Button, Group, Indicator, Popover, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { notify } from "@/shared/ui/notify";
import { shareApi } from "@/features/tests/shareApi";
import { notificationsApi, type AppNotification, type TestShareNotificationPayload } from "./notificationsApi";

const KEY = ["notifications"];

function isSharePayload(payload: AppNotification["payload"]): payload is TestShareNotificationPayload {
  return payload !== null && typeof payload === "object" && "shareId" in payload && typeof payload.shareId === "string";
}

function NotificationTitle({ title, unread }: { title: string; unread: boolean }) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
      <Text size="sm" fw={700} style={{ flex: 1, minWidth: 0 }}>
        {title}
      </Text>
      {unread ? <Box className="notification-unread-dot" aria-hidden /> : null}
    </Group>
  );
}

function ShareNotificationItem({ item }: { item: AppNotification }) {
  const queryClient = useQueryClient();
  const payload = isSharePayload(item.payload) ? item.payload : null;
  const shareId = payload?.shareId ?? "";
  const pending = shareId !== "" && payload?.status !== "ACCEPTED" && payload?.status !== "DECLINED";
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: ["tests"] });
  };
  const accept = useMutation({
    mutationFn: () => shareApi.accept(shareId),
    onSuccess: () => {
      notify.success("Тест принят");
      refresh();
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось принять")),
  });
  const decline = useMutation({
    mutationFn: () => shareApi.decline(shareId),
    onSuccess: () => {
      refresh();
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось отклонить")),
  });
  const busy = accept.isPending || decline.isPending;
  const comment = payload?.comment?.trim() ?? "";
  let main = (item.body ?? "").replace(/\.\s*$/, "");
  if (comment) {
    for (const suffix of [`. Комментарий: ${comment}`, `\n${comment}`, `Комментарий: ${comment}`]) {
      if (main.includes(suffix)) {
        main = main.replace(suffix, "");
        break;
      }
    }
    main = main.replace(/\.\s*$/, "").trim();
  }
  main = main.replace(/» \([^)]+\)$/, "»");

  return (
    <Box className="notification-item" data-unread={!item.read || undefined}>
      <NotificationTitle title={item.title} unread={!item.read} />
      {main ? <SettingsHint>{main}</SettingsHint> : null}
      {comment ? <SettingsHint>{comment}</SettingsHint> : null}
      <Text size="xs" c="dimmed">{formatDateTime(item.createdAt)}</Text>
      {pending ? (
        <Group gap="md" mt="sm" wrap="nowrap">
          <Button variant="subtle" color="gray" size="compact-sm" loading={decline.isPending} disabled={busy} onClick={() => decline.mutate()}>
            Отклонить
          </Button>
          <Button variant="filled" size="compact-sm" loading={accept.isPending} disabled={busy} onClick={() => accept.mutate()}>
            Принять
          </Button>
        </Group>
      ) : null}
    </Box>
  );
}

export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const unread = useQuery({ queryKey: [...KEY, "unread"], queryFn: notificationsApi.unread, refetchInterval: 60_000 });
  const list = useQuery({ queryKey: [...KEY, "list"], queryFn: notificationsApi.list, enabled: opened });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: refresh });
  const read = useMutation({ mutationFn: notificationsApi.read, onSuccess: refresh });
  const [confirmClear, setConfirmClear] = useState(false);
  const clear = useMutation({
    mutationFn: notificationsApi.clear,
    onSuccess: async () => {
      await refresh();
      setConfirmClear(false);
    },
  });

  const open = (item: AppNotification) => {
    if (item.type === "TEST_SHARED") {
      if (!item.read) read.mutate(item.id);
      return;
    }
    if (!item.read) read.mutate(item.id);
    setOpened(false);
    if (item.link) navigate(item.link);
  };

  const count = unread.data?.count ?? 0;
  const items = list.data?.items ?? [];

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={400} shadow="md">
      <Popover.Target>
        <Indicator label={count > 99 ? "99+" : count} size={16} disabled={count === 0} offset={6} color="red">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={count > 0 ? `Уведомления: ${count} новых` : "Уведомления"}
            onClick={() => setOpened((value) => !value)}
          >
            <Icon name="bell" size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" gap="md" px="md" py="sm" wrap="nowrap">
          <Text fw={700}>Уведомления</Text>
          <Group gap="md" wrap="nowrap">
            <Button variant="subtle" color="gray" size="compact-sm" disabled={count === 0} loading={readAll.isPending} onClick={() => readAll.mutate()}>
              Прочитать все
            </Button>
            <Button variant="subtle" color="gray" size="compact-sm" disabled={items.length === 0} onClick={() => setConfirmClear(true)}>
              Очистить
            </Button>
          </Group>
        </Group>
        <ScrollArea.Autosize mah={420}>
          {list.isSuccess && items.length === 0 && (
            <SettingsHint px="md" pb="sm">Пока ничего нет</SettingsHint>
          )}
          <Stack gap={0} pb={4}>
            {items.map((item) =>
              item.type === "TEST_SHARED" ? (
                <ShareNotificationItem key={item.id} item={item} />
              ) : (
                <UnstyledButton key={item.id} className="notification-item" data-unread={!item.read || undefined} onClick={() => open(item)}>
                  <NotificationTitle title={item.title} unread={!item.read} />
                  {item.body ? <SettingsHint>{item.body.replace(/\.\s*$/, "")}</SettingsHint> : null}
                  <Text size="xs" c="dimmed">{formatDateTime(item.createdAt)}</Text>
                </UnstyledButton>
              ),
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
      <ConfirmDialog
        open={confirmClear}
        title="Очистить уведомления?"
        confirmLabel="Очистить"
        danger
        busy={clear.isPending}
        error={clear.isError ? errorMessage(clear.error, "Не удалось очистить") : undefined}
        onConfirm={() => clear.mutate()}
        onClose={() => setConfirmClear(false)}
      >
        Все уведомления пропадут из списка
      </ConfirmDialog>
    </Popover>
  );
}
