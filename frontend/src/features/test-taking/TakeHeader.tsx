import { Box, Group, Image } from "@mantine/core";
import type { ReactNode } from "react";

type TakeHeaderProps = {
  center?: ReactNode;
  children?: ReactNode;
  leading?: ReactNode;
  variant?: "page" | "stacked";
  tone?: "light" | "iba";
};

export function TakeHeader({ center, children, leading, variant = "page", tone = "light" }: TakeHeaderProps) {
  const stacked = variant === "stacked";
  const iba = tone === "iba";
  return (
    <Box
      component="header"
      className={stacked && iba ? "runner-toefl-chrome" : undefined}
      style={{
        flex: "none",
        zIndex: 10,
        height: "var(--chrome-header-height, 64px)",
        width: stacked ? "100%" : undefined,
        background: iba ? "var(--runner-toefl-chrome-bg, var(--mantine-color-iba-8))" : "var(--mantine-color-body)",
        boxShadow: stacked ? "none" : "var(--shadow-chrome)",
        borderRadius: stacked ? "var(--mantine-radius-md) var(--mantine-radius-md) 0 0" : undefined,
        color: iba ? "var(--mantine-color-white)" : undefined,
      }}
    >
      <Box
        h="100%"
        style={{
          position: stacked && iba ? "relative" : undefined,
          display: "grid",
          gridTemplateColumns: stacked && iba ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: "var(--mantine-spacing-md)",
          paddingInline: "var(--space-16)",
        }}
      >
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0, justifySelf: "start" }}>
          <Image src="/logo.png" alt="IBA Institute" h="var(--logo-height)" w="auto" fit="contain" style={{ flex: "none" }} />
          {leading ?? null}
        </Group>

        {stacked && iba ? null : (
          <Box style={{ justifySelf: "center", minWidth: 0, maxWidth: 400, width: "min(400px, 36vw)" }}>
            {center}
          </Box>
        )}

        <Group gap="md" wrap="nowrap" justify="flex-end" style={{ minWidth: 0, justifySelf: "end" }}>
          {children}
        </Group>

        {stacked && iba && center ? (
          <Box
            className="runner-toefl-chrome-center"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              maxWidth: "min(400px, 36vw)",
              pointerEvents: "none",
            }}
          >
            <Box style={{ pointerEvents: "auto" }}>{center}</Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
