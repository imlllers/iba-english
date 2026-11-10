import { Box, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { TakeHeader } from "./TakeHeader";

export function TakeCenteredPage({ children }: { children: ReactNode }) {
  return (
    <Stack mih="100vh" gap={0} style={{ background: "var(--color-page)" }}>
      <TakeHeader />
      <Box
        component="main"
        id="main"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingInline: "var(--space-16)",
          paddingTop: "var(--space-24, 24px)",
          paddingBottom: "calc(var(--chrome-header-height) + var(--space-24, 24px))",
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}
