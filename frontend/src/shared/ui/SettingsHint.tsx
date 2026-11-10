import { Text, type TextProps } from "@mantine/core";
import type { ReactNode } from "react";

type SettingsHintProps = {
  children: ReactNode;
} & Omit<TextProps, "size" | "c" | "fw" | "children">;

export function SettingsHint({ children, ...rest }: SettingsHintProps) {
  return (
    <Text size="sm" c="dimmed" fw={500} {...rest}>
      {children}
    </Text>
  );
}
