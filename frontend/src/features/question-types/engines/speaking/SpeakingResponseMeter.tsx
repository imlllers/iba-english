import { Box, Group, Stack, Text } from "@mantine/core";
import { formatClock } from "@/shared/lib/format";
import { Icon } from "@/shared/ui/Icon";

const METER_SIZE = 40;
const STROKE = 3;
const MIC_SIZE = 20;

type SpeakingResponseMeterProps = {
  remainingSeconds: number;
  totalSeconds: number;
};

export function SpeakingResponseMeter({ remainingSeconds, totalSeconds }: SpeakingResponseMeterProps) {
  const safeTotal = Math.max(1, totalSeconds);
  const remaining = Math.max(0, Math.floor(remainingSeconds));
  const ratio = Math.min(1, remaining / safeTotal);
  const radius = (METER_SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;
  const urgent = remaining <= 5;

  return (
    <Box
      px="md"
      py="sm"
      role="timer"
      aria-live={urgent ? "polite" : "off"}
      aria-label={`Response Time ${formatClock(remaining)}`}
      style={{
        width: "fit-content",
        marginInline: "auto",
      }}
    >
      <Stack gap="sm" align="center">
        <Text
          fw={700}
          ta="center"
          style={{
            fontSize: "var(--mantine-font-size-md)",
            lineHeight: "var(--mantine-line-height-md)",
            color: "var(--color-text)",
          }}
        >
          Response Time
        </Text>
        <Group gap="md" wrap="nowrap" align="center" justify="center">
          <Box
            style={{
              position: "relative",
              width: METER_SIZE,
              height: METER_SIZE,
              flex: "none",
            }}
            aria-hidden
          >
            <svg
              width={METER_SIZE}
              height={METER_SIZE}
              viewBox={`0 0 ${METER_SIZE} ${METER_SIZE}`}
              style={{ display: "block", transform: "rotate(-90deg)" }}
            >
              <circle
                cx={METER_SIZE / 2}
                cy={METER_SIZE / 2}
                r={radius}
                fill="transparent"
                stroke="var(--color-primary-soft)"
                strokeWidth={STROKE}
              />
              <circle
                cx={METER_SIZE / 2}
                cy={METER_SIZE / 2}
                r={radius}
                fill="none"
                stroke={urgent ? "var(--color-error)" : "var(--color-primary)"}
                strokeWidth={STROKE}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - dash}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.2s ease" }}
              />
            </svg>
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: urgent ? "var(--color-error)" : "var(--color-primary)",
              }}
            >
              <Icon name="mic" size={MIC_SIZE} />
            </Box>
          </Box>
          <Text
            fw={700}
            c={urgent ? "red" : undefined}
            style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: "var(--type-h6-size)",
              lineHeight: "var(--type-h6-line)",
              minWidth: "5.5ch",
              color: urgent ? undefined : "var(--color-text)",
            }}
          >
            {formatClock(remaining)}
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}