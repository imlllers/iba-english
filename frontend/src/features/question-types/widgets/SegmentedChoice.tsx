import { Input, SegmentedControl, Stack } from "@mantine/core";

type SegmentedChoiceProps = {
  label: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange?: (value: string) => void;
  disabled?: boolean;
  withAsterisk?: boolean;
};

export function SegmentedChoice({ label, options, value, onChange, disabled = false, withAsterisk }: SegmentedChoiceProps) {
  return (
    <Stack gap="xs">
      <Input.Label>
        {label}
        {withAsterisk ? (
          <span aria-hidden style={{ color: "var(--mantine-color-error)", marginInlineStart: 4 }}>
            *
          </span>
        ) : null}
      </Input.Label>
      <SegmentedControl
        aria-label={label}
        fullWidth
        disabled={disabled}
        value={value}
        data={options.map((option) => ({ value: option.value, label: option.label }))}
        onChange={(next) => onChange?.(next)}
      />
    </Stack>
  );
}
