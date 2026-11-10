import { ActionIcon, Tooltip, type ActionIconProps } from "@mantine/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type IconButtonProps = ActionIconProps
  & Omit<ComponentPropsWithoutRef<"button">, keyof ActionIconProps | "title">
  & {
    label: string;
    tooltip?: ReactNode;
  };

export function IconButton({ label, tooltip, ...rest }: IconButtonProps) {
  return (
    <Tooltip label={tooltip ?? label} openDelay={300}>
      <ActionIcon aria-label={label} {...rest} />
    </Tooltip>
  );
}
