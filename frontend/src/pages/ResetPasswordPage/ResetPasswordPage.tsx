import { Alert, Anchor, Box, Button, Group, Image, Stack, Text, TextInput, Title } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { authApi } from "@/features/auth/authApi";
import { errorMessage } from "@/shared/api/client";
import { PasswordStrengthMeter } from "@/shared/ui/PasswordStrengthMeter";
import { SettingsHint } from "@/shared/ui/SettingsHint";

const schema = z.object({
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
  repeat: z.string().min(1, "Повторите пароль"),
}).refine((values) => values.password === values.repeat, {
  message: "Пароли не совпадают",
  path: ["repeat"],
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", repeat: "" },
  });
  const reset = useMutation({
    mutationFn: (values: FormValues) => authApi.resetPassword(token, values.password),
    onSuccess: () => navigate("/login", { replace: true, state: { passwordReset: true } }),
  });

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
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
          onSubmit={form.handleSubmit((values) => reset.mutate(values))}
        >
          <Stack gap="md">
            <Stack gap={6} align="center" ta="center">
              <Title order={1}>Новый пароль</Title>
              <SettingsHint>Придумайте пароль для входа в IBA English</SettingsHint>
            </Stack>
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
            {reset.isError && (
              <Alert color="red" variant="light" role="alert">
                {errorMessage(reset.error, "Не удалось сменить пароль")}
              </Alert>
            )}
            <Button type="submit" loading={reset.isPending} fullWidth mt={4}>
              {reset.isPending ? "Сохранение…" : "Сохранить пароль"}
            </Button>
            <Text size="sm" ta="center" c="dimmed">
              <Anchor component={Link} to="/login" fw={600}>
                Назад ко входу
              </Anchor>
            </Text>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
