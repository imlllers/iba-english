import { Select as MantineSelect, type SelectProps } from "@mantine/core";
import type { CSSProperties } from "react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Select({
  value,
  onChange,
  options,
  disabled,
  id,
  label,
  ariaLabel,
  withAsterisk,
  className,
  style,
  styles,
  size = "md",
  withinPortal = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  id?: string;
  label?: string;
  ariaLabel?: string;
  withAsterisk?: boolean;
  className?: string;
  style?: CSSProperties;
  styles?: SelectProps["styles"];
  size?: "md" | "sm";
  withinPortal?: boolean;
}) {
  const emptyLabel = options.find((option) => option.value === "")?.label;
  const selectable = options.filter((option) => option.value !== "");

  return (
    <MantineSelect
      id={id}
      className={className}
      style={style}
      styles={styles}
      label={label}
      withAsterisk={withAsterisk}
      aria-label={ariaLabel ?? label}
      data={[
        ...(emptyLabel ? [{ value: "__empty__", label: emptyLabel }] : []),
        ...selectable.map((option) => ({
          value: option.value,
          label: option.label,
          disabled: option.disabled,
        })),
      ]}
      value={value === "" ? (emptyLabel ? "__empty__" : null) : value}
      disabled={disabled}
      size={size === "sm" ? "sm" : "md"}
      allowDeselect={false}
      checkIconPosition="right"
      comboboxProps={{ withinPortal }}
      onChange={(next) => onChange(!next || next === "__empty__" ? "" : next)}
    />
  );
}
