import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Отмена",
  busyLabel = "Подождите…",
  danger = false,
  busy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal opened={open} onClose={onClose} title={title} size="sm" centered>
      <Stack gap="md">
        <Text size="md">{children}</Text>
        {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={onClose}>{cancelLabel}</Button>
          <Button color={danger ? "red" : "iba"} loading={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
