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

function parseNumberInput(
  next: string | number | undefined | null,
  step: number,
): number | undefined | null {
  if (next === "" || next === undefined || next === null) {
    return undefined;
  }
  let parsed = typeof next === "number" ? next : Number(next);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (step >= 1) {
    parsed = Math.round(parsed);
  }
  return parsed;
}

function clampInRange(value: number, min: number | undefined, max: number | undefined) {
  let parsed = value;
  if (max !== undefined && parsed > max) {
    parsed = max;
  }
  if (min !== undefined && parsed < min) {
    parsed = min;
  }
  return parsed;
}

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
  const hasBounds = max !== undefined || min !== undefined;

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
      clampBehavior={hasBounds ? "blur" : undefined}
      decimalScale={step < 1 ? 2 : 0}
      allowNegative={min < 0}
      placeholder={placeholder}
      onChange={(next) => {
        const parsed = parseNumberInput(next, step);
        if (parsed === null) {
          return;
        }
        if (parsed === undefined) {
          onChange(undefined);
          return;
        }
        onChange(parsed);
      }}
      onBlur={() => {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return;
        }
        const clamped = clampInRange(value, min, max);
        if (clamped !== value) {
          onChange(clamped);
        }
      }}
    />
  );
}
