import { Switch as MantineSwitch } from "@mantine/core";

export function Switch({
  checked,
  onChange,
  label,
  description,
  labelSize = "md",
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  labelSize?: "md" | "sm";
  disabled?: boolean;
}) {
  const withDescription = Boolean(description);
  return (
    <MantineSwitch
      checked={checked}
      disabled={disabled}
      label={label}
      description={description}
      onChange={(event) => onChange(event.currentTarget.checked)}
      styles={{
        body: {
          alignItems: withDescription ? "flex-start" : "center",
        },
        track: {
          marginTop: withDescription ? 2 : 0,
        },
        ...(labelSize === "sm"
          ? {
              label: {
                fontSize: "var(--mantine-font-size-sm)",
                lineHeight: "var(--mantine-line-height-sm)",
                fontWeight: 600,
              },
            }
          : {}),
      }}
    />
  );
}
