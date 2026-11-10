import { Alert, Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { errorMessage } from "@/shared/api/client";
import { Select } from "@/shared/ui/Select";
import { adminApi } from "./adminApi";

const createSchema = z.object({
  email: z.string().trim().email("Укажите email в формате name@example.com"),
  displayName: z.string().trim().min(1, "Укажите имя").max(120, "Не длиннее 120 символов"),
  password: z.string().min(8, "Не короче 8 символов").max(128, "Не длиннее 128 символов"),
  role: z.enum(["TEACHER", "ADMIN"]),
});

type CreateValues = z.infer<typeof createSchema>;

export function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { email: "", displayName: "", password: "", role: "TEACHER" } });
  const create = useMutation({
    mutationFn: (values: CreateValues) => adminApi.createUser({ ...values, email: values.email.trim(), displayName: values.displayName.trim() }),
    onSuccess: () => {
      form.reset();
      onCreated();
    },
  });
  const errors = form.formState.errors;
  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="Новый пользователь"
      centered
    >
      <form noValidate onSubmit={form.handleSubmit((values) => create.mutate(values))}>
        <Stack gap="md">
          <TextInput
            label="Email"
            withAsterisk
            type="email"
            autoComplete="off"
            placeholder="Введите email"
            error={errors.email?.message}
            {...form.register("email")}
          />
          <TextInput
            label="Имя"
            withAsterisk
            autoComplete="off"
            placeholder="Введите имя"
            error={errors.displayName?.message}
            {...form.register("displayName")}
          />
          <TextInput
            label="Временный пароль"
            withAsterisk
            description="Не короче 8 символов. Передайте его пользователю лично"
            type="text"
            autoComplete="new-password"
            placeholder="Введите пароль"
            error={errors.password?.message}
            {...form.register("password")}
          />
          <Select
            label="Роль"
            withAsterisk
            value={form.watch("role")}
            onChange={(role) => form.setValue("role", role as CreateValues["role"])}
            options={[
              { value: "TEACHER", label: "Преподаватель" },
              { value: "ADMIN", label: "Администратор" },
            ]}
          />
          {create.isError && (
            <Alert color="red" variant="light" role="alert">
              {errorMessage(create.error, "Пользователь не создан")}
            </Alert>
          )}
          <Group justify="flex-end" gap="md">
            <Button variant="default" type="button" onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={create.isPending}>
              {create.isPending ? "Создание…" : "Создать"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
