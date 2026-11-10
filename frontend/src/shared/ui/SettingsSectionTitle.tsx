import { Text } from "@mantine/core";
import type { ReactNode } from "react";

export function SettingsSectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <Text id={id} size="lg" fw={700}>
      {children}
    </Text>
  );
}
