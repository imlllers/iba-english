import { Alert, Anchor, Box, Button, Checkbox, Divider, Group, Image, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import type { User } from "@/entities/user/types";
import { authApi } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/useSession";
import { ApiError, errorMessage } from "@/shared/api/client";
import { SettingsHint } from "@/shared/ui/SettingsHint";

const schema = z.object({
  email: z.string().trim().email("Укажите email в формате name@example.com"),
  password: z.string().min(1, "Введите пароль"),
  rememberMe: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const home = (user: User) => (user.role === "ADMIN" ? "/admin/teachers" : "/teacher/tests");
const area = (user: User) => (user.role === "ADMIN" ? "/admin" : "/teacher");
const target = (user: User, from?: string) => (from?.startsWith(area(user)) ? from : home(user));

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { secret: adminSecret } = useParams();
  const from = (location.state as { from?: string } | null)?.from;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  const login = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values.email, values.password, values.rememberMe, adminSecret),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      navigate(target(user, from), { replace: true });
    },
  });
  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(form.getValues("email")),
  });
  const needsVerification =
    login.isError && login.error instanceof ApiError && login.error.code === "EMAIL_NOT_VERIFIED";

  if (session.data) {
    return <Navigate to={target(session.data, from)} replace />;
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
        <Box
          component="form"
          w="100%"
          maw={480}
          noValidate
          onSubmit={form.handleSubmit((values) => login.mutate(values))}
        >
          <Stack gap="md">
            <Stack gap={6} align="center" ta="center">
              <Title order={1}>С возвращением!</Title>
              <SettingsHint>Войдите в аккаунт IBA English</SettingsHint>
            </Stack>

            <TextInput
              label="Email"
              withAsterisk
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...form.register("email")}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field }) => (
                <PasswordInput
                  label="Пароль"
                  withAsterisk
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  error={errors.password?.message}
                  value={field.value}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  ref={field.ref}
                  visibilityToggleButtonProps={{
                    "aria-label": "Показать или скрыть пароль",
                  }}
                />
              )}
            />
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Controller
                name="rememberMe"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    label="Запомнить меня"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.currentTarget.checked)}
                    styles={{
                      label: {
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: "var(--mantine-line-height-sm)",
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
              />
              <Anchor component={Link} to="/forgot-password" size="sm">
                Забыли пароль?
              </Anchor>
            </Group>
            {login.isError && (
              <Alert color="red" variant="light" role="alert">
                {errorMessage(login.error, "Не удалось войти")}
              </Alert>
            )}
            {needsVerification && (
              <Stack gap="var(--grid-gutter)">
                {resend.isSuccess && (
                  <Alert color="teal" variant="light" role="status">
                    Письмо отправлено ещё раз
                  </Alert>
                )}
                {resend.isError && (
                  <Alert color="red" variant="light" role="alert">
                    {errorMessage(resend.error, "Не удалось отправить письмо ещё раз")}
                  </Alert>
                )}
                <Button variant="default" fullWidth loading={resend.isPending} onClick={() => resend.mutate()}>
                  Отправить письмо ещё раз
                </Button>
              </Stack>
            )}
            <Button type="submit" loading={login.isPending} fullWidth mt={4}>
              {login.isPending ? "Вход…" : "Войти"}
            </Button>
            <Divider label="или" labelPosition="center" />
            <Text size="sm" ta="center" c="dimmed">
              Нет аккаунта?{" "}
              <Anchor component={Link} to="/register" fw={600}>
                Зарегистрироваться
              </Anchor>
            </Text>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
