import { Alert, Anchor, Box, Button, Group, Image, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import type { User } from "@/entities/user/types";
import { authApi } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/useSession";
import { errorMessage } from "@/shared/api/client";
import { PasswordStrengthMeter } from "@/shared/ui/PasswordStrengthMeter";
import { SettingsHint } from "@/shared/ui/SettingsHint";

const schema = z.object({
  inviteCode: z.string().trim().min(1, "Введите код приглашения"),
  email: z.string().trim().email("Укажите email в формате name@example.com"),
  displayName: z.string().trim().min(1, "Укажите имя").max(120, "Не длиннее 120 символов"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
  repeat: z.string().min(1, "Повторите пароль"),
}).refine((values) => values.password === values.repeat, {
  message: "Пароли не совпадают",
  path: ["repeat"],
});

type FormValues = z.infer<typeof schema>;

const home = (user: User) => (user.role === "ADMIN" ? "/admin/teachers" : "/teacher/tests");

export function RegisterPage() {
  const session = useSession();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { inviteCode: "", email: "", displayName: "", password: "", repeat: "" },
  });
  const register = useMutation({
    mutationFn: (values: FormValues) => authApi.register({
      inviteCode: values.inviteCode,
      email: values.email,
      displayName: values.displayName,
      password: values.password,
    }),
  });
  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(form.getValues("email")),
  });

  if (session.data) {
    return <Navigate to={home(session.data)} replace />;
  }

  const errors = form.formState.errors;
  return (
    <Stack mih="100vh" gap={0} bg="var(--mantine-color-body)">
      <Group h={72} px="md" style={{ flex: "none" }}>
        <Image src="/logo-iba.png" alt="IBA Institute" h="var(--logo-height)" w="auto" fit="contain" />
      </Group>
      <Box
        component="main"
        id="main"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingInline: "var(--space-16)",
          paddingTop: "clamp(56px, 15vh, 140px)",
          paddingBottom: "var(--page-pad-bottom)",
        }}
      >
        {register.isSuccess ? (
          <Stack gap="md" w="100%" maw={480} align="center" ta="center">
            <Title order={1}>Проверьте почту</Title>
            <SettingsHint>
              Мы отправили ссылку для подтверждения email. После перехода по ней можно войти. Ссылка действует 24 часа
            </SettingsHint>
            {resend.isError && (
              <Alert color="red" variant="light" role="alert" w="100%">
                {errorMessage(resend.error, "Не удалось отправить письмо ещё раз")}
              </Alert>
            )}
            {resend.isSuccess && (
              <Alert color="teal" variant="light" role="status" w="100%">
                Письмо отправлено ещё раз
              </Alert>
            )}
            <Group grow gap="md" wrap="nowrap" w="100%">
              <Button variant="default" loading={resend.isPending} onClick={() => resend.mutate()}>
                Отправить ещё раз
              </Button>
              <Button component={Link} to="/login">
                Перейти ко входу
              </Button>
            </Group>
          </Stack>
        ) : (
          <Box
            component="form"
            w="100%"
            maw={480}
            noValidate
            onSubmit={form.handleSubmit((values) => register.mutate(values))}
          >
            <Stack gap="md">
              <Stack gap={6} align="center" ta="center">
                <Title order={1}>Регистрация</Title>
                <SettingsHint>Нужен код приглашения от администратора</SettingsHint>
              </Stack>
              <TextInput
                label="Код приглашения"
                withAsterisk
                autoComplete="off"
                placeholder="Введите код от администратора"
                error={errors.inviteCode?.message}
                {...form.register("inviteCode")}
              />
              <TextInput
                label="Имя"
                withAsterisk
                autoComplete="name"
                placeholder="Как к вам обращаться"
                error={errors.displayName?.message}
                {...form.register("displayName")}
              />
              <TextInput
                label="Email"
                withAsterisk
                type="email"
                autoComplete="username"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...form.register("email")}
              />
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" style={{ alignItems: "start" }}>
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <TextInput
type="password"
                        label="Пароль"
                        withAsterisk
                        autoComplete="new-password"
                        placeholder="Придумайте пароль"
                        error={errors.password?.message}
                        value={field.value}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        ref={field.ref}
                      />
                      <PasswordStrengthMeter password={field.value} />
                    </div>
                  )}
                />
                <Controller
                  name="repeat"
                  control={form.control}
                  render={({ field }) => (
                    <TextInput
type="password"
                      label="Повторите пароль"
                      withAsterisk
                      autoComplete="new-password"
                      placeholder="Повторите пароль"
                      error={errors.repeat?.message}
                      value={field.value}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      ref={field.ref}
                    />
                  )}
                />
              </SimpleGrid>
              {register.isError && (
                <Alert color="red" variant="light" role="alert">
                  {errorMessage(register.error, "Не удалось зарегистрироваться")}
                </Alert>
              )}
              <Button type="submit" loading={register.isPending} fullWidth mt={4}>
                {register.isPending ? "Регистрация…" : "Создать аккаунт"}
              </Button>
              <Text size="sm" ta="center" c="dimmed">
                Уже есть аккаунт?{" "}
                <Anchor component={Link} to="/login" fw={600}>
                  Войти
                </Anchor>
              </Text>
            </Stack>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
