import { Paper, type PaperProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";

type SettingsCardProps = PaperProps & Omit<ComponentPropsWithoutRef<"div">, keyof PaperProps>;

export function SettingsCard({ children, ...rest }: SettingsCardProps) {
  return (
    <Paper radius="md" shadow="sm" {...rest}>
      {children}
    </Paper>
  );
}
