import { Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { SegmentOptions, TextRule } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { Switch } from "@/shared/ui/Switch";
import { docPlainText, emptyRule, plainToDoc, splitSegments } from "../../content";
import { AcceptedAnswersField } from "../../widgets/AcceptedAnswersField";
import type { EditorProps } from "../types";
import { SegmentText } from "./SegmentText";

export function ErrorHuntContent({ question, update }: EditorProps) {
  const options = question.options as SegmentOptions;
  const errors = (question.answerKey.errors as Record<string, TextRule>) ?? {};
  const marked = (options.segments ?? []).filter((segment) => errors[segment.id]);
  const sentences = question.type === "SENTENCE_ERRORS";
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  useEffect(() => {
    const prompt = docPlainText(question.promptContent);
    const stored = options.text ?? "";
    if (!prompt.trim() && stored.trim()) {
      update({ promptContent: plainToDoc(stored) });
      return;
    }
    const next = sentences ? prompt.replace(/\n/g, " ").trim() : prompt;
    if (next === stored) return;
    const segments = splitSegments(next, "WORD");
    const ids = new Set(segments.map((segment) => segment.id));
    const keep = errorsRef.current;
    update({
      options: { text: next, unit: "WORD", segments },
      answerKey: { errors: Object.fromEntries(Object.entries(keep).filter(([id]) => ids.has(id))) },
    });
  }, [question.promptContent, question.type, options.text, sentences, update]);

  const toggle = (id: string) => {
    const next = { ...errors };
    if (next[id]) {
      delete next[id];
    } else {
      next[id] = emptyRule();
    }
    update({ answerKey: { errors: next } });
  };

  const hasText = Boolean((options.text ?? "").trim());

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="sm" fw={600}>Отметьте слова с ошибками</Text>
        {!hasText ? (
          <SettingsHint>
            {sentences ? "Введите предложение в блоке выше." : "Введите текст в блоке «Текст» выше."}
          </SettingsHint>
        ) : (
          <SegmentText
            label={sentences ? "Предложение" : "Слова текста"}
            tone="error"
            segments={options.segments ?? []}
            isOn={(id) => Boolean(errors[id])}
            onToggle={toggle}
          />
        )}
      </Stack>
      <Stack gap="sm">
        <Text size="sm" fw={600}>Исправления</Text>
        <Switch
          checked={question.settings.reviewIfNoMatch ?? true}
          onChange={(reviewIfNoMatch) => update({ settings: { ...question.settings, reviewIfNoMatch } })}
          label="Если исправление не совпало, отправить на ручную проверку"
          labelSize="sm"
        />
        {hasText && marked.length === 0 && <SettingsHint>Отметьте ошибки в тексте выше</SettingsHint>}
        {marked.map((segment) => (
          <AcceptedAnswersField
            key={`${question.id}-${segment.id}`}
            label={`Вместо «${segment.text}»`}
            rule={errors[segment.id]}
            onChange={(rule) => update({ answerKey: { errors: { ...errors, [segment.id]: rule } } })}
          />
        ))}
      </Stack>
    </Stack>
  );
}
