import { Stack, Textarea } from "@mantine/core";
import type { Question } from "@/entities/question/types";
import type { ExamDisplayType } from "@/entities/test/types";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { ContentFeedEditor } from "./content/ContentFeedEditor";
import { questionItems, questionPatch } from "./content/contentItems";
import { ENGINES } from "./engines";
import { engineOf } from "./registry";
import { InstructionsField } from "./widgets/InstructionsField";

type QuestionEditorProps = {
  question: Question;
  update: (patch: Partial<Question>) => void;
  startNumber?: number;
  examType?: ExamDisplayType;
  errorExplanationsEnabled?: boolean;
};

export function QuestionEditor({
  question,
  update,
  startNumber = 1,
  examType = "CUSTOM",
  errorExplanationsEnabled = false,
}: QuestionEditorProps) {
  const engine = engineOf(question.type);
  const ui = ENGINES[engine];
  const Content = ui.Content;
  const Answers = ui.Answers;

  return (
    <Stack gap="sm" component="article">
      <ContentFeedEditor
        title="Вопрос"
        titleSize="lg"
        items={questionItems(question)}
        promptRequired={engine !== "WRITTEN" && engine !== "SPEAKING" && engine !== "CHOICE" && engine !== "MULTI_CHOICE"}
        prompt={{
          mode: ui.prompt,
          numberBlanks: true,
          startNumber,
          label: question.type === "SENTENCE_GAPS"
            ? "Предложения"
            : question.type === "SENTENCE_ERRORS"
              ? "Предложение"
              : question.type === "TEXT_ERRORS"
                ? "Текст с ошибками"
                : engine === "INLINE"
                  ? "Пропуски в общем тексте"
                  : undefined,
        }}
        beforeItems={(
          <InstructionsField
            value={question.settings.instructions}
            onChange={(doc) => {
              update({
                settings: {
                  ...question.settings,
                  instructions: doc,
                },
              });
            }}
          />
        )}
        onChange={(items) => update(questionPatch(items, question.settings))}
      />
      <Stack gap="md" component="section" aria-labelledby={`body-${question.id}`}>
        <SettingsSectionTitle id={`body-${question.id}`}>Ответ</SettingsSectionTitle>
        {Content ? <Content question={question} update={update} startNumber={startNumber} examType={examType} /> : null}
        <Answers question={question} update={update} part="body" startNumber={startNumber} examType={examType} />
        {errorExplanationsEnabled ? (
          <Textarea
            label="Пояснение при ошибке"
            minRows={2}
            maxLength={2000}
            value={question.settings.errorExplanation ?? ""}
            onChange={(event) => {
              update({
                settings: {
                  ...question.settings,
                  errorExplanation: event.currentTarget.value,
                },
              });
            }}
          />
        ) : null}
      </Stack>
    </Stack>
  );
}
