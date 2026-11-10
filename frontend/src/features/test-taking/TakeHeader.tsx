import { Box, Group, Image } from "@mantine/core";
import type { ReactNode } from "react";

type TakeHeaderProps = {
  center?: ReactNode;
  children?: ReactNode;
};

export function TakeHeader({ center, children }: TakeHeaderProps) {
  return (
    <Box
      component="header"
      style={{
        flex: "none",
        zIndex: 10,
        height: 64,
        background: "var(--mantine-color-body)",
        boxShadow: "var(--shadow-chrome)",
      }}
    >
      <Box
        h="100%"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: "var(--mantine-spacing-md)",
          paddingInline: "var(--space-16)",
        }}
      >
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Image src="/logo.png" alt="IBA Institute" h="var(--logo-height)" w="auto" fit="contain" style={{ flex: "none" }} />
        </Group>

        <Box style={{ justifySelf: "center", minWidth: 0, maxWidth: 400, width: "min(400px, 36vw)" }}>
          {center}
        </Box>

        <Group gap="md" wrap="nowrap" justify="flex-end" style={{ minWidth: 0 }}>
          {children}
        </Group>
      </Box>
    </Box>
  );
}
