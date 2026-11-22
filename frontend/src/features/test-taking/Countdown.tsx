import { Group, Text } from "@mantine/core";
import { formatClock } from "@/shared/lib/format";
import { Icon } from "@/shared/ui/Icon";

type CountdownProps = {
  seconds: number;
  label?: string;
  digitsOnly?: boolean;
  calm?: boolean;
  onDark?: boolean;
};

export function Countdown({ label, seconds, digitsOnly = false, calm = false, onDark = false }: CountdownProps) {
  const low = !calm && !onDark && seconds <= 300;
  const clock = formatClock(Math.max(0, seconds));

  if (digitsOnly) {
    return (
      <Text
        component="div"
        role="timer"
        aria-live={seconds <= 60 ? "polite" : "off"}
        aria-label={label ? `${label} ${clock}` : clock}
        fw={700}
        c={low ? "red" : onDark ? undefined : "dimmed"}
        style={{
          fontSize: 18,
          lineHeight: "26px",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          ...(onDark ? { color: "var(--mantine-color-white)" } : {}),
        }}
      >
        {clock}
      </Text>
    );
  }

  return (
    <Group
      gap={6}
      wrap="nowrap"
      role="timer"
      aria-live={seconds <= 60 ? "polite" : "off"}
      c={low ? "red" : "dimmed"}
      px={low ? 8 : 0}
      py={low ? 2 : 0}
      style={low ? { border: "1px solid var(--mantine-color-red-6)", borderRadius: "var(--mantine-radius-sm)" } : undefined}
    >
      <Icon name="clock" />
      {label ? <Text size="sm" span>{label}</Text> : null}
      <Text size="sm" fw={700} c={low ? "red" : undefined} span style={{ fontVariantNumeric: "tabular-nums" }}>
        {clock}
      </Text>
    </Group>
  );
}
