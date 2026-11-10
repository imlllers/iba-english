import { Box, Group, Image, Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { SettingsHint } from "@/shared/ui/SettingsHint";

export function MessagePage({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Stack mih="100vh" gap={0}>
      <Group h="var(--chrome-header-height)" px="md" style={{ flex: "none", zIndex: 10, background: "var(--mantine-color-body)", boxShadow: "var(--shadow-chrome)" }}>
        <Image src="/logo-iba.png" alt="IBA Institute" h="var(--logo-height)" w="auto" fit="contain" />
      </Group>
      <Box
        component="main"
        id="main"
        px="md"
        pt={{ base: 32, sm: 64 }}
        pb="var(--page-pad-bottom)"
        maw={720}
        mx="auto"
        w="100%"
      >
        <Stack gap="md">
          <Title order={1}>{title}</Title>
          {children && <SettingsHint>{children}</SettingsHint>}
          {action && <Group gap="md">{action}</Group>}
        </Stack>
      </Box>
    </Stack>
  );
}
