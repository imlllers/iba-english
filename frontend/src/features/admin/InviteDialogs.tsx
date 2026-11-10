import { Alert, Button, Group, Modal, NumberInput, Stack } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/shared/api/client";
import { adminApi, type Invite } from "./adminApi";

export function CreateInviteDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: Invite) => void;
}) {
  const [validDays, setValidDays] = useState<number | string>(7);
  const close = () => {
    setValidDays(7);
    create.reset();
    onClose();
  };
  const create = useMutation({
    mutationFn: () => {
      const days = typeof validDays === "number" ? validDays : Number(validDays);
      return adminApi.createInvite(Number.isFinite(days) ? days : 7);
    },
    onSuccess: (invite) => {
      onCreated(invite);
      close();
    },
  });

  return (
    <Modal opened={open} onClose={close} title="Новое приглашение" centered>
      <Stack gap="md">
        <NumberInput
          label="Срок действия, дней"
          min={1}
          max={90}
          value={validDays}
          onChange={setValidDays}
        />
        {create.isError && (
          <Alert color="red" variant="light" role="alert">
            {errorMessage(create.error, "Не удалось создать приглашение")}
          </Alert>
        )}
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={close}>Отмена</Button>
          <Button loading={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Создание…" : "Создать"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
