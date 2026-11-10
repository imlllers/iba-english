import { NumberInput, Stack } from "@mantine/core";
import { DISABLED_SUFFIX, ERROR_EXPLANATIONS_ENABLED, QUESTION_NUMBER_FORMATS, RESULT_DISPLAY_ENABLED, RESULT_REVIEW_ENABLED } from "@/entities/test/settings";
import type {
  ErrorExplanationMode,
  QuestionNumberFormat,
  QuestionNumberScope,
  ResultDetail,
  TestSettings,
} from "@/entities/test/types";
import { ScaleBindingCard, type ScaleTarget } from "@/features/score-scales/ScaleBindingCard";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { Switch } from "@/shared/ui/Switch";

const RESULT_OPTIONS: { value: ResultDetail; label: string; disabled?: boolean }[] = [
  { value: "score_only", label: "Только балл" },
  RESULT_REVIEW_ENABLED
    ? { value: "score_and_review", label: "Балл и отображение ответов" }
    : { value: "score_and_review", label: "Балл и отображение ответов" + DISABLED_SUFFIX, disabled: true },
];

const ERROR_EXPLANATION_WHEN_OPTIONS: { value: Exclude<ErrorExplanationMode, "off">; label: string }[] = [
  { value: "during", label: "Во время прохождения" },
  { value: "after", label: "После сдачи" },
  { value: "both", label: "Во время и после сдачи" },
];

const NUMBER_FORMAT_OPTIONS = QUESTION_NUMBER_FORMATS.map((value) => ({ value, label: value }));

const NUMBER_SCOPE_OPTIONS: { value: QuestionNumberScope; label: string }[] = [
  { value: "test", label: "Сплошная по тесту" },
  { value: "section", label: "С каждой секции" },
  { value: "part", label: "С каждой части" },
];

export function TestSettingsCards({
  settings,
  onChange,
  scaleTargets,
}: {
  settings: TestSettings;
  onChange: (patch: Partial<TestSettings>) => void;
  scaleTargets?: ScaleTarget[];
}) {
  const showResult = RESULT_DISPLAY_ENABLED && settings.showResultToParticipant;
  const resultDetail: ResultDetail =
    RESULT_REVIEW_ENABLED && settings.resultDetail === "score_and_review" ? "score_and_review" : "score_only";
  const explanationMode = settings.errorExplanationMode ?? "off";
  const showExplanations = ERROR_EXPLANATIONS_ENABLED && explanationMode !== "off";
  const explanationWhen: Exclude<ErrorExplanationMode, "off"> =
    explanationMode === "during" || explanationMode === "both" ? explanationMode : "after";

  return (
    <>
      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Доступ</SettingsSectionTitle>
          <Switch
            label="Спрашивать email участника"
            description="Перед стартом участник вводит email. На него можно отправлять результат"
            checked={settings.requireParticipantEmail}
            onChange={(checked) => onChange({ requireParticipantEmail: checked })}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Прохождение</SettingsSectionTitle>
          <Select
            label="Формат нумерации"
            withAsterisk
            value={settings.questionNumberFormat ?? "1"}
            options={NUMBER_FORMAT_OPTIONS}
            onChange={(value) => onChange({ questionNumberFormat: (value as QuestionNumberFormat) || "1" })}
          />
          <Select
            label="Нумерация заданий"
            withAsterisk
            value={settings.questionNumberScope ?? "test"}
            options={NUMBER_SCOPE_OPTIONS}
            onChange={(value) => onChange({ questionNumberScope: (value as QuestionNumberScope) || "test" })}
          />
          <Switch
            label="Каждый вопрос с новой страницы"
            description="Если выключено: при наличии частей – одна страница на часть, иначе – на секцию. У отдельной части можно задать своё значение"
            checked={settings.oneQuestionPerPage ?? true}
            onChange={(checked) => onChange({ oneQuestionPerPage: checked })}
          />
          <Switch
            label="Можно возвращаться в пройденную секцию"
            description="Разрешает снова открыть секцию после перехода к следующей"
            checked={settings.allowBackToSection ?? true}
            onChange={(checked) => onChange({ allowBackToSection: checked })}
          />
          <Switch
            label="Досрочная сдача"
            description="Показать кнопку завершить тест до последней страницы. Если выключено – Finish только в конце"
            checked={settings.allowEarlySubmit !== false}
            onChange={(checked) => onChange({ allowEarlySubmit: checked })}
          />
          <Switch
            label="Автопереход по таймеру задания"
            description="Когда время на задание истекло – сразу следующее (как в TOEFL)"
            checked={Boolean(settings.autoAdvanceOnQuestionTimeout)}
            onChange={(checked) => onChange({ autoAdvanceOnQuestionTimeout: checked })}
          />
          {settings.examType === "TOEFL" ? (
            <NumberInput
              label="Время на ответ в Listening, сек"
              description="Отсчёт начинается после аудио, затем вопрос перелистывается сам. Действует на все вопросы Listening"
              value={settings.listeningAnswerSeconds ?? 20}
              min={5}
              max={600}
              allowDecimal={false}
              onChange={(value) => onChange({ listeningAnswerSeconds: typeof value === "number" && value > 0 ? value : 20 })}
            />
          ) : null}
          <Switch
            label="Перемешивать варианты ответа"
            description="Порядок вариантов в заданиях с выбором у каждого участника будет случайным"
            checked={settings.shuffleChoices ?? false}
            onChange={(checked) => onChange({ shuffleChoices: checked })}
          />
          <Switch
            label="Автозапуск аудио"
            description="Аудио блока и задания стартует при входе на страницу (иначе участник жмёт Play). Пауза и перемотка назад недоступны. При лимите времени на задание отсчёт начнётся после прослушивания"
            checked={settings.audioAutoStart ?? false}
            onChange={(checked) => onChange({ audioAutoStart: checked })}
          />
          <Switch
            label="Контроль ухода со страницы"
            description="При переключении на другую вкладку или окно участник получает предупреждение. После лимита попытка сдаётся автоматически"
            checked={(settings.focusLossMaxWarnings ?? 0) > 0}
            onChange={(checked) =>
              onChange({
                focusLossMaxWarnings: checked ? (settings.focusLossMaxWarnings || 3) : null,
              })
            }
          />
          {(settings.focusLossMaxWarnings ?? 0) > 0 && (
            <NumberInput
              label="Число предупреждений"
              withAsterisk
              value={settings.focusLossMaxWarnings ?? 3}
              min={1}
              max={20}
              onChange={(value) => {
                const next = typeof value === "number" && value > 0 ? value : 3;
                onChange({ focusLossMaxWarnings: next });
              }}
            />
          )}
        </Stack>
      </SettingsCard>

      {scaleTargets && (
        <ScaleBindingCard value={settings.scoreScale} examType={settings.examType} targets={scaleTargets} onChange={(scoreScale) => onChange({ scoreScale })} />
      )}

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>После сдачи</SettingsSectionTitle>
          <Switch
            label={RESULT_DISPLAY_ENABLED ? "Показывать результат участнику" : "Показывать результат участнику" + DISABLED_SUFFIX}
            description="После отправки участник увидит страницу с итогом. Если выключено – только подтверждение сдачи"
            disabled={!RESULT_DISPLAY_ENABLED}
            checked={showResult}
            onChange={(checked) => onChange({ showResultToParticipant: checked })}
          />
          {showResult && (
            <Select
              label="Что показывать"
              withAsterisk
              value={resultDetail}
              options={RESULT_OPTIONS}
              onChange={(value) => onChange({ resultDetail: (value as ResultDetail) || "score_only" })}
            />
          )}
          {showResult && settings.scoreScale && (
            <Switch
              label="Показывать уровень и баллы по секциям"
              description="На странице результата появятся баллы шкалы по секциям и итоговый уровень"
              checked={settings.showLevelToParticipant}
              onChange={(checked) => onChange({ showLevelToParticipant: checked })}
            />
          )}
          <Switch
            label="Отправлять результат на email"
            description={
              settings.requireParticipantEmail
                ? "Письмо уходит сразу после сдачи, а если нужна ручная проверка – когда проверены все задания"
                : "Включите «Спрашивать email участника», чтобы было куда отправлять"
            }
            disabled={!settings.requireParticipantEmail}
            checked={settings.emailResultToParticipant && settings.requireParticipantEmail}
            onChange={(checked) => onChange({ emailResultToParticipant: checked })}
          />
          <Switch
            label={ERROR_EXPLANATIONS_ENABLED ? "Пояснения при ошибке" : "Пояснения при ошибке – временно недоступны"}
            description="В редакторе заданий появится поле пояснения. Участник видит текст только при неверном автоответе (или после проверки, если балл неполный)"
            disabled={!ERROR_EXPLANATIONS_ENABLED}
            checked={showExplanations}
            onChange={(checked) => onChange({ errorExplanationMode: checked ? "after" : "off" })}
          />
          {showExplanations && (
            <Select
              label="Когда показывать"
              withAsterisk
              value={explanationWhen}
              options={ERROR_EXPLANATION_WHEN_OPTIONS}
              onChange={(value) =>
                onChange({
                  errorExplanationMode: (value as Exclude<ErrorExplanationMode, "off">) || "after",
                })
              }
            />
          )}
        </Stack>
      </SettingsCard>
    </>
  );
}
