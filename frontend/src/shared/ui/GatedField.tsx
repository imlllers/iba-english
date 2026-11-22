import { NumberInput, type NumberInputProps, type SelectProps } from "@mantine/core";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";

const inactiveFieldStyles = {
  label: {
    color: "var(--mantine-color-gray-6)",
    fontWeight: 500,
  },
  description: {
    color: "var(--mantine-color-gray-6)",
  },
  input: {
    color: "var(--mantine-color-gray-6)",
    backgroundColor: "var(--mantine-color-gray-0)",
    borderColor: "var(--mantine-color-gray-3)",
    opacity: 1,
  },
} satisfies NonNullable<SelectProps["styles"]>;

const inactiveNumberStyles = {
  label: inactiveFieldStyles.label,
  description: inactiveFieldStyles.description,
  input: inactiveFieldStyles.input,
};

export function GatedSelect({
  active,
  label,
  description,
  withAsterisk,
  value,
  options,
  onChange,
}: {
  active: boolean;
  label: string;
  description?: string;
  withAsterisk?: boolean;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      label={label}
      description={description}
      withAsterisk={withAsterisk}
      value={value}
      options={options}
      disabled={!active}
      styles={active ? undefined : inactiveFieldStyles}
      onChange={onChange}
    />
  );
}

export function GatedNumberInput({
  active,
  label,
  description,
  withAsterisk,
  value,
  onChange,
  min,
  max,
  allowDecimal,
}: {
  active: boolean;
  label: string;
  description?: string;
  withAsterisk?: boolean;
  value: number | string;
  onChange: NumberInputProps["onChange"];
  min?: number;
  max?: number;
  allowDecimal?: boolean;
}) {
  return (
    <NumberInput
      label={label}
      description={description}
      withAsterisk={withAsterisk}
      value={value}
      min={min}
      max={max}
      allowDecimal={allowDecimal}
      disabled={!active}
      styles={active ? undefined : inactiveNumberStyles}
      onChange={onChange}
    />
  );
}

export function GatedSwitch({
  active,
  label,
  description,
  checked,
  onChange,
}: {
  active: boolean;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Switch
      label={label}
      description={description}
      checked={checked}
      disabled={!active}
      onChange={onChange}
    />
  );
}