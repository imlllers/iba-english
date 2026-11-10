import { Stack, TextInput } from "@mantine/core";
import type { TextAnswerKey, TextAnswerMode } from "@/entities/question/types";
import { Select } from "@/shared/ui/Select";
import { AcceptedAnswersField } from "../../widgets/AcceptedAnswersField";
import { NumberField } from "../../widgets/NumberField";
import type { EditorProps } from "../types";

const MODES: { value: TextAnswerMode; label: string }[] = [
  { value: "TEXT", label: "Слово или фраза" },
  { value: "NUMBER", label: "Число" },
  { value: "DATE", label: "Дата" },
  { value: "TIME", label: "Время" },
];

export function TextAnswerContent({ question, update }: EditorProps) {
  const key = question.answerKey as TextAnswerKey;
  const mode = key.mode ?? "TEXT";
  const setKey = (patch: Partial<TextAnswerKey>) => {
    const next = { ...key, ...patch };
    update({ answerKey: next, options: { ...(question.options as object), mode: next.mode ?? "TEXT" } });
  };

  return (
    <Stack gap="md">
      <Select
        label="Формат ответа"
        withAsterisk
        value={mode}
        onChange={(next) => setKey({ mode: next as TextAnswerMode })}
        options={MODES}
      />
      {mode === "TEXT" && (
        <AcceptedAnswersField key={`${question.id}-text`} label="Допустимые ответы" rule={key} onChange={(rule) => setKey(rule)} />
      )}
      {mode === "NUMBER" && (
        <>
          <NumberField label="Число" withAsterisk value={key.number} step={0.01} min={-1e9} onChange={(number) => setKey({ number })} />
          <NumberField label="Допустимая погрешность" value={key.tolerance ?? 0} step={0.01} onChange={(tolerance) => setKey({ tolerance: tolerance ?? 0 })} />
        </>
      )}
      {mode === "DATE" && (
        <AcceptedAnswersField key={`${question.id}-date`} label="Даты в формате ГГГГ-ММ-ДД" rule={key} onChange={(rule) => setKey(rule)} />
      )}
      {mode === "TIME" && (
        <>
          <TextInput
            type="time"
            label="Время"
            withAsterisk
            value={key.time ?? ""}
            onChange={(event) => setKey({ time: event.currentTarget.value })}
          />
          <NumberField label="Погрешность, минуты" value={key.tolerance ?? 0} onChange={(tolerance) => setKey({ tolerance: tolerance ?? 0 })} />
        </>
      )}
    </Stack>
  );
}
