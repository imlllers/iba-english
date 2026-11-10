import { Alert, Anchor, Box, Button, Divider, Group, Image, Stack, Text, TextInput, Title } from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { authApi } from "@/features/auth/authApi";
import { errorMessage } from "@/shared/api/client";
import { SettingsHint } from "@/shared/ui/SettingsHint";

const schema = z.object({
  email: z.string().trim().email("Укажите email в формате name@example.com"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const forgot = useMutation({
    mutationFn: (values: FormValues) => authApi.forgotPassword(values.email),
  });

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
        {forgot.isSuccess ? (
          <Stack gap="md" w="100%" maw={480} align="center" ta="center">
            <Title order={1}>Письмо отправлено</Title>
            <SettingsHint>
              Если аккаунт с таким email есть, вы получите ссылку для нового пароля. Она действует 1 час – проверьте
              входящие и папку «Спам»
            </SettingsHint>
            <Button component={Link} to="/login" fullWidth mt={4}>
              Вернуться ко входу
            </Button>
          </Stack>
        ) : (
          <Box
            component="form"
            w="100%"
            maw={480}
            noValidate
            onSubmit={form.handleSubmit((values) => forgot.mutate(values))}
          >
            <Stack gap="md">
              <Stack gap={6} align="center" ta="center">
                <Title order={1}>Сброс пароля</Title>
                <SettingsHint>Введите email вашего аккаунта</SettingsHint>
              </Stack>
              <TextInput
                label="Email"
                withAsterisk
                type="email"
                autoComplete="username"
                placeholder="name@example.com"
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />
              {forgot.isError && (
                <Alert color="red" variant="light" role="alert">
                  {errorMessage(forgot.error, "Не удалось отправить письмо")}
                </Alert>
              )}
              <Button type="submit" loading={forgot.isPending} fullWidth mt={4}>
                {forgot.isPending ? "Отправка…" : "Отправить ссылку"}
              </Button>
              <Divider label="или" labelPosition="center" />
              <Text size="sm" ta="center" c="dimmed">
                Вспомнили пароль?{" "}
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
