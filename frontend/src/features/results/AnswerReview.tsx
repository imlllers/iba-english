import { Alert, Box, Button, Collapse, Group, Stack, Table, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { AttemptDetail, ReviewedAnswer } from "@/entities/attempt/types";
import type { ExamDisplayType } from "@/entities/test/types";
import type { Question, TextRule } from "@/entities/question/types";
import { QuestionPlayer } from "@/features/question-types/QuestionPlayer";
import { publicView } from "@/features/question-types/content";
import { teacherReviewShowTask } from "@/features/question-types/content/teacherReviewTask";
import { formatQuestionRange } from "@/features/question-types/numbering";
import { ENGINES } from "@/features/question-types/engines";
import { useMedia } from "@/features/question-types/media/MediaContext";
import { engineOf } from "@/features/question-types/registry";
import { NumberField } from "@/features/question-types/widgets/NumberField";
import { errorMessage } from "@/shared/api/client";
import { countWords, formatScore } from "@/shared/lib/format";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { Icon } from "@/shared/ui/Icon";
import { RecordingPlayback } from "@/shared/ui/RecordingPlayback";
import { MARK_LABELS, sheetRows, type SheetRow } from "./answerSheet";
import { resultsApi } from "./resultsApi";

export type NumberedAnswer = { answer: ReviewedAnswer; start: number; count: number };

function acceptedAnswers(question: Question) {
  const engine = engineOf(question.type);
  if (engine === "TEXT_ANSWER" || engine === "TRANSFORM") {
    const key = question.answerKey as TextRule & { mode?: string };
    return key.mode && key.mode !== "TEXT" ? null : (key.accepted ?? null);
  }
  if (engine === "ERROR_HUNT") {
    const errors = (question.answerKey.errors as Record<string, TextRule>) ?? {};
    return Object.values(errors).map((rule) => (rule.accepted ?? []).join(" / "));
  }
  return null;
}

function headline({ answer, start, count }: NumberedAnswer) {
  const label = `${count > 1 ? "Questions" : "Question"} ${formatQuestionRange(start, count)}`;
  return `${label}${answer.question ? "" : " · удалено из теста"}`;
}

export function isReviewCard({ answer }: NumberedAnswer) {
  if (answer.needsReview) {
    return true;
  }
  if (!answer.question) {
    return false;
  }
  const engine = engineOf(answer.question.type);
  return engine === "WRITTEN" || engine === "SPEAKING";
}

type ReviewFormProps = {
  attemptId: string;
  answer: ReviewedAnswer;
  onSaved: (detail: AttemptDetail) => void;
};

function ReviewForm({ attemptId, answer, onSaved }: ReviewFormProps) {
  const max = answer.maxScore ?? 0;
  const openMax = max <= 0;
  const [score, setScore] = useState<number | undefined>(answer.awardedScore ?? undefined);
  const save = useMutation({
    mutationFn: () => resultsApi.review(attemptId, answer.questionId, {
      awardedScore: score ?? 0,
      feedback: answer.feedback ?? "",
      criterionScores: null,
    }),
    onSuccess: onSaved,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (score !== undefined) save.mutate();
      }}
    >
      <Stack gap="sm">
        <Group gap="md" align="flex-end" justify="flex-end" wrap="nowrap">
          <Box w={120}>
            <NumberField
              size="sm"
              label={openMax ? "Балл" : `Балл, из ${max}`}
              withAsterisk
              placeholder={openMax ? "0" : `0-${max}`}
              value={score}
              max={openMax ? 1000 : max}
              step={0.5}
              onChange={setScore}
            />
          </Box>
          <Button type="submit" size="sm" disabled={score === undefined} loading={save.isPending}>
            Сохранить
          </Button>
        </Group>
        {save.isError && (
          <Alert color="red" variant="light" role="alert">{errorMessage(save.error, "Оценка не сохранена")}</Alert>
        )}
      </Stack>
    </form>
  );
}

function WordCount({ question, text }: { question: Question; text: string }) {
  const words = countWords(text);
  const { minWords, maxWords } = question.settings;
  const over = Boolean(maxWords && words > maxWords);
  const under = Boolean(minWords && words < minWords);
  const inRange = Boolean((minWords || maxWords) && !over && !under);
  const range = minWords && maxWords ? `от ${minWords} до ${maxWords}` : minWords ? `от ${minWords}` : maxWords ? `до ${maxWords}` : "";
  return (
    <Text size="sm" fw={500} c={over ? "red" : under ? "yellow.8" : inRange ? "green" : "dimmed"}>
      Слов: {words}
      {range ? ` (нужно ${range})` : ""}
      {over ? " – больше нормы" : ""}
      {under ? " – меньше нормы" : ""}
    </Text>
  );
}

export function AnswerReview({ attemptId, item, examType = "CUSTOM", onSaved }: {
  attemptId: string;
  item: NumberedAnswer;
  examType?: ExamDisplayType;
  onSaved: (detail: AttemptDetail) => void;
}) {
  const { answer, start } = item;
  const [showTask, setShowTask] = useState(false);
  const accepted = answer.question ? acceptedAnswers(answer.question) : null;
  const engine = answer.question ? engineOf(answer.question.type) : null;
  const Player = engine ? ENGINES[engine].Player : null;
  const written = engine === "WRITTEN";
  const speaking = engine === "SPEAKING";
  const text = String(answer.answerData?.text ?? "");
  const recording = answer.answerData ?? {};
  const media = useMedia();
  const answerRecordingSrc = recording.mediaId ? media.recording(recording.mediaId as string) : null;
  const taskTextVisible = answer.question ? teacherReviewShowTask(answer.question) : false;
  return (
    <Stack id={`answer-${answer.questionId}`} gap="sm">
      <Group gap="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700} size="md">
            {headline(item)}
          </Text>
        </Group>
        {answer.question && taskTextVisible ? (
          <Button
            variant="subtle"
            size="compact-sm"
            rightSection={<Icon name={showTask ? "up" : "down"} />}
            onClick={() => setShowTask((value) => !value)}
            style={{ flex: "none" }}
          >
            {showTask ? "Скрыть задание" : "Показать задание"}
          </Button>
        ) : null}
      </Group>
      {showTask && answer.question && taskTextVisible ? (
        <QuestionPlayer
          question={publicView(answer.question)}
          kicker={examType === "TOEFL" ? "" : formatQuestionRange(start, answer.count ?? 1)}
          answer={{}}
          readOnly
          startNumber={start}
          hideAnswer
          examType={examType}
          teacherReview
        />
      ) : null}
      {written && answer.question ? (
        <Stack gap="sm">
          <Box
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            {answer.question.settings.minWords || answer.question.settings.maxWords ? (
              <Group justify="flex-end" px="md" pt="sm" pb={4}>
                <WordCount question={answer.question} text={text} />
              </Group>
            ) : null}
            <Textarea
              aria-label="Ответ участника"
              minRows={4}
              autosize
              readOnly
              value={text}
              variant="unstyled"
              px="md"
              pb="sm"
            />
          </Box>
          <Group justify="flex-end" align="flex-end" wrap="nowrap" gap="md">
            <ReviewForm
              key={`${answer.questionId}-${answer.awardedScore ?? "pending"}`}
              attemptId={attemptId}
              answer={answer}
              onSaved={onSaved}
            />
          </Group>
        </Stack>
      ) : speaking && answer.question ? (
        <Stack gap="sm">
          <Group align="flex-end" justify="flex-end" wrap="nowrap" gap="md" w="100%">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} mb="xs">Запись ответа</Text>
              {answerRecordingSrc ? (
                <RecordingPlayback
                  src={answerRecordingSrc}
                  durationSeconds={recording.durationSeconds as number | undefined}
                  wide
                  aria-label="Запись ответа"
                />
              ) : (
                <Text c="dimmed" fw={500} size="sm">Нет записи – файл ответа не сохранился</Text>
              )}
            </Box>
            <Box style={{ flexShrink: 0 }}>
              <ReviewForm
                key={`${answer.questionId}-${answer.awardedScore ?? "pending"}`}
                attemptId={attemptId}
                answer={answer}
                onSaved={onSaved}
              />
            </Box>
          </Group>
        </Stack>
      ) : Player && answer.question ? (
        <Player
          question={publicView(answer.question)}
          answer={recording}
          onAnswer={() => undefined}
          readOnly
          startNumber={start}
          numberFormat="1"
        />
      ) : null}
      {accepted && accepted.length > 0 && <SettingsHint>Принимаемые ответы: {accepted.join("; ")}</SettingsHint>}
      {!speaking && !written ? (
        <ReviewForm
          key={`${answer.questionId}-${answer.awardedScore ?? "pending"}`}
          attemptId={attemptId}
          answer={answer}
          onSaved={onSaved}
        />
      ) : null}
    </Stack>
  );
}

const MARK_STYLE: Record<SheetRow["mark"], { bg?: string; color: string; icon: "check" | "close" }> = {
  correct: { color: "var(--mantine-color-green-8)", icon: "check" },
  wrong: { bg: "var(--mantine-color-red-0)", color: "var(--mantine-color-red-8)", icon: "close" },
  empty: { bg: "var(--mantine-color-red-0)", color: "var(--mantine-color-red-8)", icon: "close" },
};

type SheetItem = NumberedAnswer & { rows: SheetRow[]; visible: SheetRow[] };

function manualSheetGiven(answer: ReviewedAnswer, question: Question | null | undefined): string {
  if (!question) {
    return "Задание удалено из теста";
  }
  const engine = engineOf(question.type);
  if (engine === "WRITTEN") {
    const text = String(answer.answerData?.text ?? "").trim();
    return text || "—";
  }
  if (engine === "SPEAKING") {
    return answer.answerData?.mediaId ? "Аудиозапись" : "Нет записи";
  }
  return answer.feedback || "Оценено вручную";
}

function QuestionRows({ item }: { item: SheetItem }) {
  const { answer, start, count, rows, visible } = item;
  if (rows.length === 0) {
    return (
      <Table.Tr>
        <Table.Td>{formatQuestionRange(start, count)}</Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
            {manualSheetGiven(answer, answer.question)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">Ручная проверка</Text>
        </Table.Td>
        <Table.Td ta="center" style={{ whiteSpace: "nowrap" }}>
          <Text size="sm" c="dimmed">—</Text>
        </Table.Td>
      </Table.Tr>
    );
  }
  return (
    <>
      {visible.map((row) => {
        const style = MARK_STYLE[row.mark];
        return (
          <Table.Tr key={row.key} style={style.bg ? { background: style.bg } : undefined}>
            <Table.Td>{row.label}</Table.Td>
            <Table.Td style={{ color: style.color, fontWeight: 600 }}>{row.given}</Table.Td>
            <Table.Td>{row.expected}</Table.Td>
            <Table.Td ta="center" style={{ color: style.color }} title={MARK_LABELS[row.mark]} aria-label={MARK_LABELS[row.mark]}>
              <Icon name={style.icon} />
            </Table.Td>
          </Table.Tr>
        );
      })}
    </>
  );
}

function sumScores(items: NumberedAnswer[]) {
  return formatScore(
    items.reduce((sum, { answer }) => sum + (answer.awardedScore ?? 0), 0),
    items.reduce((sum, { answer }) => sum + (answer.maxScore ?? 0), 0),
  );
}

export function SectionSheet({ title, items, errorsOnly, showTitle = true }: {
  title: string;
  items: NumberedAnswer[];
  errorsOnly: boolean;
  showTitle?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const sheet: SheetItem[] = items
    .map((item) => {
      const rows = item.answer.question ? sheetRows(item.answer.question, item.answer.answerData ?? {}, item.answer.marks, item.start, item.count) : [];
      return { ...item, rows, visible: errorsOnly ? rows.filter((row) => row.mark !== "correct") : rows };
    })
    .filter((item) => !errorsOnly || item.visible.length > 0);
  if (errorsOnly && sheet.length === 0) return null;

  return (
    <Box>
      {showTitle ? (
        <UnstyledButton w="100%" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <Group justify="space-between" gap="md" wrap="nowrap">
            <Text fw={700} size="lg">{title}</Text>
            <Group gap="md" wrap="nowrap">
              <Text fw={700}>{sumScores(items)}</Text>
              <Icon name={open ? "up" : "down"} />
            </Group>
          </Group>
        </UnstyledButton>
      ) : null}
      <Collapse expanded={open}>
        <Table mt={showTitle ? "xs" : 0} verticalSpacing={4} horizontalSpacing="xs" highlightOnHover={false} withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="10%">№</Table.Th>
              <Table.Th w="40%">Ответ участника</Table.Th>
              <Table.Th w="40%">Правильный ответ</Table.Th>
              <Table.Th w="10%" ta="center">Итог</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sheet.map((item) => (
              <QuestionRows key={item.answer.questionId} item={item} />
            ))}
          </Table.Tbody>
        </Table>
      </Collapse>
    </Box>
  );
}

export function sectionGroups(items: NumberedAnswer[]) {
  const groups: { title: string; items: NumberedAnswer[] }[] = [];
  for (const item of items) {
    const title = item.answer.sectionTitle || "Без секции";
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}