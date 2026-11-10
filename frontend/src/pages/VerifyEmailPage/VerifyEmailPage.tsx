import { Alert, Box, Button, Group, Image, Stack, Title } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/features/auth/authApi";
import { errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { SettingsHint } from "@/shared/ui/SettingsHint";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
  });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

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
        <Stack gap="md" w="100%" maw={480} align="center" ta="center">
          {verify.isPending && (
            <>
              <Title order={1}>Подтверждаем email…</Title>
              <Loading />
            </>
          )}
          {verify.isSuccess && (
            <>
              <Title order={1}>Email подтверждён</Title>
              <SettingsHint>Можно войти в аккаунт IBA English</SettingsHint>
              <Button component={Link} to="/login" fullWidth mt={4}>
                Войти
              </Button>
            </>
          )}
          {verify.isError && (
            <>
              <Title order={1}>Ссылка не сработала</Title>
              <Alert color="red" variant="light" role="alert" w="100%">
                {errorMessage(verify.error, "Ссылка недействительна или устарела")}
              </Alert>
              <Button component={Link} to="/login" variant="default" fullWidth mt={4}>
                Назад ко входу
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
