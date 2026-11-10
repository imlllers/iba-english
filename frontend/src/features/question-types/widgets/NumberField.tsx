import { NumberInput } from "@mantine/core";

type NumberFieldProps = {
  label: string;
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  placeholder?: string;
  withAsterisk?: boolean;
  size?: "sm" | "md";
};

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  hint,
  placeholder = "Введите число",
  withAsterisk,
  size,
}: NumberFieldProps) {
  return (
    <NumberInput
      size={size}
      label={label}
      withAsterisk={withAsterisk}
      description={hint || undefined}
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      decimalScale={step < 1 ? 2 : 0}
      allowNegative={min < 0}
      placeholder={placeholder}
      onChange={(next) => {
        if (next === "" || next === undefined || next === null) {
          onChange(undefined);
          return;
        }
        const parsed = typeof next === "number" ? next : Number(next);
        if (Number.isFinite(parsed)) {
          onChange(step >= 1 ? Math.round(parsed) : parsed);
        }
      }}
    />
  );
}
