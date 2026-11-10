import { Stack, TextInput } from "@mantine/core";
import type { TextRule, TransformOptions } from "@/entities/question/types";
import { Switch } from "@/shared/ui/Switch";
import { AcceptedAnswersField } from "../../widgets/AcceptedAnswersField";
import type { EditorProps } from "../types";

export function TransformContent({ question, update }: EditorProps) {
  const options = question.options as TransformOptions;
  const review = question.settings.reviewIfNoMatch ?? false;
  const set = (patch: Partial<TransformOptions>) => update({ options: { ...options, ...patch } });
  return (
    <Stack gap="md">
      <TextInput
        label="Слово-основа"
        withAsterisk
        placeholder="Введите слово"
        value={options.source ?? ""}
        onChange={(event) => set({ source: event.currentTarget.value })}
      />
      <AcceptedAnswersField
        key={question.id}
        label="Допустимые ответы"
        rule={question.answerKey as TextRule}
        onChange={(rule) => update({ answerKey: rule })}
      />
      <Switch
        checked={review}
        onChange={(reviewIfNoMatch) => update({ settings: { ...question.settings, reviewIfNoMatch } })}
        label="Если ответ не совпал, отправить на ручную проверку"
      />
    </Stack>
  );
}
