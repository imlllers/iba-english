import { Group, Progress, Stack, Text } from "@mantine/core";

const REQUIREMENTS = [
  (value: string) => value.length >= 8,
  (value: string) => /[a-zа-яё]/i.test(value),
  (value: string) => /[A-ZА-ЯЁ]/.test(value),
  (value: string) => /[0-9]/.test(value),
  (value: string) => /[^A-Za-zА-Яа-яЁё0-9]/.test(value),
];

function strengthScore(password: string): number {
  if (!password) return 0;
  const met = REQUIREMENTS.filter((test) => test(password)).length;
  return Math.round((met / REQUIREMENTS.length) * 100);
}

function strengthMeta(score: number): { color: string; label: string } {
  if (score < 40) return { color: "red", label: "Слабый" };
  if (score < 60) return { color: "orange", label: "Слабоватый" };
  if (score < 80) return { color: "yellow", label: "Средний" };
  if (score < 100) return { color: "teal", label: "Хороший" };
  return { color: "teal", label: "Отличный" };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = strengthScore(password);
  const { color, label } = strengthMeta(score);
  const empty = password.length === 0;

  return (
    <Stack gap={6} mt={8} aria-live="polite">
      <Group justify="space-between" gap="sm" wrap="nowrap" align="baseline">
        <Text
          size="xs"
          c="dimmed"
          fw={500}
          style={{ fontSize: "var(--mantine-font-size-xs)", lineHeight: "var(--mantine-line-height-xs)" }}
        >
          Надёжность пароля
        </Text>
        {!empty && (
          <Text
            size="xs"
            fw={600}
            c={color}
            style={{
              fontSize: "var(--mantine-font-size-xs)",
              lineHeight: "var(--mantine-line-height-xs)",
            }}
          >
            {label}
          </Text>
        )}
      </Group>
      <Progress
        value={empty ? 0 : Math.max(score, 8)}
        color={empty ? "gray.3" : color}
        size={8}
        radius="xl"
        transitionDuration={150}
        aria-label="Надёжность пароля"
      />
    </Stack>
  );
}
