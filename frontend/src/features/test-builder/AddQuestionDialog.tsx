import { Alert, Modal, NumberInput, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useState } from "react";
import type { QuestionType } from "@/entities/question/types";
import { DISABLED_SUFFIX } from "@/entities/test/settings";
import { ANSWER_CATALOG, DISABLED_QUESTION_TYPES, INLINE_CATALOG, TYPE_META } from "@/features/question-types/registry";

const MAX_COUNT = 40;

type AddQuestionDialogProps = {
  open: boolean;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onPick: (type: QuestionType, count: number) => void;
};

export function AddQuestionDialog({ open, busy, error, onClose, onPick }: AddQuestionDialogProps) {
  const [count, setCount] = useState<number | string>(1);

  useEffect(() => {
    if (open) {
      setCount(1);
    }
  }, [open]);

  const amount = typeof count === "number" && Number.isInteger(count) && count >= 1 && count <= MAX_COUNT ? count : null;

  const renderTypes = (types: QuestionType[]) => (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {types.map((type) => {
        const off = DISABLED_QUESTION_TYPES.has(type);
        const inactive = busy || !amount || off;
        return (
          <UnstyledButton
            key={type}
            disabled={inactive}
            style={{ display: "block", width: "100%", borderRadius: "var(--mantine-radius-md)" }}
            onClick={() => amount && !off && onPick(type, amount)}
          >
            <Paper
              withBorder
              shadow="none"
              radius="md"
              h="100%"
              style={{
                opacity: inactive ? 0.55 : 1,
                transition: "border-color 120ms ease, background-color 120ms ease",
              }}
              styles={{
                root: {
                  "&:hover": inactive
                    ? undefined
                    : {
                        borderColor: "var(--mantine-color-iba-4)",
                        background: "var(--mantine-color-iba-0)",
                      },
                },
              }}
            >
              <Stack gap={6}>
                <Text fw={600} size="md" lh={1.35}>{TYPE_META[type].label}{off ? DISABLED_SUFFIX : ""}</Text>
                <Text size="sm" c="gray.7" lh={1.45}>{TYPE_META[type].hint}</Text>
              </Stack>
            </Paper>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );

  return (
    <Modal opened={open} onClose={onClose} title="Добавить задание" size="lg" padding="lg">
      <Stack gap="md">
        <NumberInput
          label="Количество"
          withAsterisk
          value={count}
          min={1}
          max={MAX_COUNT}
          allowDecimal={false}
          allowNegative={false}
          disabled={busy}
          w="100%"
          error={amount ? undefined : "Укажите число от 1 до 40"}
          onChange={setCount}
        />
        {error ? <Alert color="red" variant="light">{error}</Alert> : null}
        <Stack gap="xs">
          <Text size="sm" fw={600} c="dimmed">Формат ответа</Text>
          {renderTypes(ANSWER_CATALOG)}
        </Stack>
        <Stack gap="xs">
          <Text size="sm" fw={600} c="dimmed">Ответы в тексте</Text>
          {renderTypes(INLINE_CATALOG)}
        </Stack>
      </Stack>
    </Modal>
  );
}
