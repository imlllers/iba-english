import { Stack } from "@mantine/core";
import {
  DISABLED_SUFFIX,
  errorExplanationsEnabled,
  QUESTION_NUMBER_FORMATS,
  resultDisplayEnabled,
} from "@/entities/test/settings";
import type {
  ErrorExplanationMode,
  QuestionNumberFormat,
  QuestionNumberScope,
  ResultDetail,
  TestSettings,
} from "@/entities/test/types";
import { GatedNumberInput, GatedSelect } from "@/shared/ui/GatedField";
import { buildResultOptions, effectiveResultDetail } from "@/entities/test/resultDisplay";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { Switch } from "@/shared/ui/Switch";

const ERROR_EXPLANATION_WHEN_OPTIONS: { value: Exclude<ErrorExplanationMode, "off">; label: string }[] = [
  { value: "during", label: "Во время прохождения" },
  { value: "after", label: "После сдачи" },
  { value: "both", label: "Во время и после сдачи" },
];

const NUMBER_FORMAT_OPTIONS = QUESTION_NUMBER_FORMATS.map((value) => ({ value, label: value }));

const NUMBER_SCOPE_OPTIONS: { value: QuestionNumberScope; label: string }[] = [
  { value: "test", label: "Сквозная" },
  { value: "section", label: "По секциям" },
  { value: "part", label: "По частям" },
];

export function TestSettingsCards({
  settings,
  onChange,
}: {
  settings: TestSettings;
  onChange: (patch: Partial<TestSettings>) => void;
}) {
  const displayResults = resultDisplayEnabled(settings.examType);
  const explanationsOn = errorExplanationsEnabled(settings.examType);
  const showResult = displayResults && settings.showResultToParticipant;
  const resultDetail = effectiveResultDetail(settings.resultDetail, Boolean(settings.scoreScale));
  const explanationMode = settings.errorExplanationMode ?? "off";
  const showExplanations = explanationsOn && explanationMode !== "off";
  const explanationWhen: Exclude<ErrorExplanationMode, "off"> =
    explanationMode === "during" || explanationMode === "both" ? explanationMode : "after";
  const hideNumbering = settings.examType === "TOEFL";
  return (
    <>
      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Навигация</SettingsSectionTitle>
          <Switch
            label="Один вопрос на странице"
            description="Если выключено, на странице показывается вся часть. У каждой части можно задать своё значение"
            checked={settings.oneQuestionPerPage ?? true}
            onChange={(checked) => onChange({ oneQuestionPerPage: checked })}
          />
          <Switch
            label="Возврат к предыдущим секциям"
            description="Разрешает открыть завершённую секцию"
            checked={settings.allowBackToSection ?? true}
            onChange={(checked) => onChange({ allowBackToSection: checked })}
          />
          <Switch
            label="Досрочное завершение"
            description="Кнопка завершения теста доступна в любой момент"
            checked={settings.allowEarlySubmit !== false}
            onChange={(checked) => onChange({ allowEarlySubmit: checked })}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Время</SettingsSectionTitle>
          <Switch
            label="Автопереход по истечении времени вопроса"
            description="Для вопросов, у которых задано время на вкладке «Время»"
            checked={Boolean(settings.autoAdvanceOnQuestionTimeout)}
            onChange={(checked) => onChange({ autoAdvanceOnQuestionTimeout: checked })}
          />
          <Switch
            label="Автопереход по истечении времени части"
            description="Когда время части вышло, тест сам переходит к следующей части"
            checked={Boolean(settings.autoAdvanceOnPartTimeout)}
            onChange={(checked) => onChange({ autoAdvanceOnPartTimeout: checked })}
          />
          <Switch
            label="Пауза таймера части во время прослушивания аудио/видео"
            description="Время части учитывается только при ответе на вопросы"
            checked={Boolean(settings.pausePartTimerDuringAudio)}
            onChange={(checked) => onChange({ pausePartTimerDuringAudio: checked })}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Аудио и видео</SettingsSectionTitle>
          <Switch
            label="Автовоспроизведение аудио"
            description="Аудио запускается при открытии страницы, без паузы и перемотки. Время на ответ начинается после окончания записи"
            checked={settings.audioAutoStart ?? false}
            onChange={(checked) => onChange({ audioAutoStart: checked })}
          />
          <Switch
            label="Автовоспроизведение видео"
            description="Видео в вопросе запускается при открытии страницы"
            checked={Boolean(settings.videoAutoStart)}
            onChange={(checked) => onChange({ videoAutoStart: checked })}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Контроль</SettingsSectionTitle>
          <Switch
            label="Контроль выхода из окна теста"
            description="Предупреждение при переходе на другую вкладку или окно"
            checked={(settings.focusLossMaxWarnings ?? 0) > 0}
            onChange={(checked) =>
              onChange({
                focusLossMaxWarnings: checked ? (settings.focusLossMaxWarnings || 3) : null,
              })
            }
          />
          <GatedNumberInput
            active={(settings.focusLossMaxWarnings ?? 0) > 0}
            label="Допустимое число предупреждений"
            description="После превышения попытка завершается автоматически"
            withAsterisk
            value={settings.focusLossMaxWarnings ?? 3}
            min={1}
            max={20}
            allowDecimal={false}
            onChange={(value) => {
              const next = typeof value === "number" && value > 0 ? value : 3;
              onChange({ focusLossMaxWarnings: next });
            }}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Результаты</SettingsSectionTitle>
          <Switch
            label={displayResults ? "Отображение результата" : "Отображение результата" + DISABLED_SUFFIX}
            description="Если выключено, отображается только подтверждение отправки"
            disabled={!displayResults}
            checked={showResult}
            onChange={(checked) => onChange({ showResultToParticipant: checked })}
          />
          <GatedSelect
            active={displayResults && settings.showResultToParticipant}
            label="Что отображать"
            withAsterisk
            value={resultDetail}
            options={buildResultOptions(Boolean(settings.scoreScale))}
            onChange={(value) => onChange({ resultDetail: (value as ResultDetail) || "score_only" })}
          />
          <Switch
            label="Отправка результата на email"
            description={
              settings.requireParticipantEmail
                ? "Письмо уходит сразу после сдачи, а если нужна ручная проверка – когда проверены все вопросы"
                : "Включите «Запрашивать email перед началом», чтобы было куда отправлять"
            }
            disabled={!settings.requireParticipantEmail}
            checked={settings.emailResultToParticipant && settings.requireParticipantEmail}
            onChange={(checked) =>
              onChange({
                emailResultToParticipant: checked,
                ...(checked ? { requireParticipantEmail: true } : {}),
              })
            }
          />
          <Switch
            label={
              explanationsOn
                ? "Пояснения к неверным ответам"
                : "Пояснения к неверным ответам" + DISABLED_SUFFIX
            }
            description="В редакторе вопросов появится поле для пояснения. Студент увидит его, если ответил неверно"
            disabled={!explanationsOn}
            checked={showExplanations}
            onChange={(checked) => onChange({ errorExplanationMode: checked ? "after" : "off" })}
          />
          <GatedSelect
            active={explanationsOn && showExplanations}
            label="Когда отображать"
            withAsterisk
            value={explanationWhen}
            options={ERROR_EXPLANATION_WHEN_OPTIONS}
            onChange={(value) =>
              onChange({
                errorExplanationMode: (value as Exclude<ErrorExplanationMode, "off">) || "after",
              })
            }
          />
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Прочее</SettingsSectionTitle>
          <Switch
            label="Запрашивать email перед началом"
            description="Без email студент не сможет начать. На этот адрес можно отправлять результат"
            checked={settings.requireParticipantEmail}
            onChange={(checked) => onChange({ requireParticipantEmail: checked })}
          />
          {hideNumbering ? null : (
            <>
              <Select
                label="Формат номера вопроса"
                withAsterisk
                value={settings.questionNumberFormat ?? "1"}
                options={NUMBER_FORMAT_OPTIONS}
                onChange={(value) => onChange({ questionNumberFormat: (value as QuestionNumberFormat) || "1" })}
              />
              <Select
                label="Нумерация вопросов"
                withAsterisk
                value={settings.questionNumberScope ?? "test"}
                options={NUMBER_SCOPE_OPTIONS}
                onChange={(value) => onChange({ questionNumberScope: (value as QuestionNumberScope) || "test" })}
              />
            </>
          )}
        </Stack>
      </SettingsCard>
    </>
  );
}