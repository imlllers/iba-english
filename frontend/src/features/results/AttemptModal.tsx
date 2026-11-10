import { Alert, Box, Group, Modal, SegmentedControl, Stack, Table, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { AttemptDetail } from "@/entities/attempt/types";
import { MediaProvider, type MediaResolver } from "@/features/question-types/media/MediaContext";
import { teacherMediaUrl } from "@/features/media-library/mediaApi";
import { questionSlotCount } from "@/features/question-types/numbering";
import { ManualScore } from "@/features/score-scales/ScaleResultView";
import { formatNumber } from "@/features/score-scales/scoreScale";
import { errorMessage } from "@/shared/api/client";
import { formatScore } from "@/shared/lib/format";
import { Loading } from "@/shared/ui/Loading";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { AnswerReview, SectionSheet, sectionGroups, type NumberedAnswer } from "./AnswerReview";
import { recordingUrl, resultsApi } from "./resultsApi";

function SummaryTable({ attempt, sections, onManual }: {
  attempt: AttemptDetail;
  sections: { title: string; items: NumberedAnswer[] }[];
  onManual: (index: number, score: number | null) => void;
}) {
  const scale = attempt.scaleResult;
  return (
    <Table verticalSpacing={6} highlightOnHover={false}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="50%">Секция</Table.Th>
          <Table.Th w="25%" ta="center">Баллы</Table.Th>
          {scale && <Table.Th w="25%" ta="center">{scale.title}</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {scale
          ? scale.sections.map((section) => (
            <Table.Tr key={section.index}>
              <Table.Td>{section.name}</Table.Td>
              <Table.Td ta="center">{section.raw === null || !section.rawMax ? "–" : formatScore(section.raw, section.rawMax)}</Table.Td>
              <Table.Td ta="center">
                {section.method === "manual" && !section.pending ? (
                  <Group justify="center"><ManualScore section={section} compact onSave={(score) => onManual(section.index, score)} /></Group>
                ) : section.score !== null ? (
                  formatNumber(section.score)
                ) : (
                  <Text span c="dimmed" fz="inherit" lh="inherit">{section.pending ? "ждёт проверки" : "–"}</Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))
          : sections.map((section) => (
            <Table.Tr key={section.title + section.items[0].answer.questionId}>
              <Table.Td>{section.title}</Table.Td>
              <Table.Td ta="center">
                {formatScore(
                  section.items.reduce((sum, { answer }) => sum + (answer.awardedScore ?? 0), 0),
                  section.items.reduce((sum, { answer }) => sum + (answer.maxScore ?? 0), 0),
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        <Table.Tr>
          <Table.Td fw={700}>Итого</Table.Td>
          <Table.Td ta="center" fw={700}>{formatScore(attempt.score, attempt.maxScore)}</Table.Td>
          {scale && (
            <Table.Td ta="center" fw={700}>
              {scale.total !== null ? `${formatNumber(scale.total)}${scale.level ? ` (${scale.level})` : ""}` : "–"}
            </Table.Td>
          )}
        </Table.Tr>
      </Table.Tbody>
    </Table>
  );
}

function AttemptBody({ attempt, onSaved }: { attempt: AttemptDetail; onSaved: (next: AttemptDetail) => void }) {
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const scaleScore = useMutation({
    mutationFn: ({ index, score }: { index: number; score: number | null }) => resultsApi.scaleScore(attempt.id, index, score),
    onSuccess: onSaved,
  });
  let nextNumber = 1;
  const numbered: NumberedAnswer[] = attempt.answers.map((answer) => {
    const count = answer.count ?? (answer.question ? questionSlotCount(answer.question) : 1);
    const start = answer.number ?? nextNumber;
    nextNumber = start + count;
    return { answer, start, count };
  });
  const toReview = numbered.filter(({ answer }) => answer.needsReview);
  const sections = sectionGroups(numbered.filter(({ answer }) => !answer.needsReview));
  const marks = attempt.answers.flatMap((answer) => Object.values(answer.marks ?? {}));
  const wrong = marks.filter((mark) => mark !== "correct").length;

  return (
    <Stack gap="md">
      <SettingsSectionTitle>Итоги</SettingsSectionTitle>
      <SummaryTable
        attempt={attempt}
        sections={sectionGroups(numbered)}
        onManual={(index, score) => scaleScore.mutate({ index, score })}
      />
      {scaleScore.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(scaleScore.error, "Не удалось сохранить балл")}</Alert>
      )}
      {attempt.answers.length === 0 && <SettingsHint>Участник не ответил ни на одно задание</SettingsHint>}
      {toReview.length > 0 && (
        <>
          <Box mt="sm"><SettingsSectionTitle>Нужно проверить ({toReview.length})</SettingsSectionTitle></Box>
          {toReview.map((item) => (
            <AnswerReview key={item.answer.questionId} attemptId={attempt.id} item={item} onSaved={onSaved} />
          ))}
        </>
      )}
      {sections.length > 0 && (
        <>
          <Group justify="space-between" align="center" gap="md" mt="sm">
            <SettingsSectionTitle>Ответы</SettingsSectionTitle>
            {marks.length > 0 && (
              <SegmentedControl
                size="sm"
                value={filter}
                onChange={(value) => setFilter(value as "all" | "errors")}
                data={[
                  { value: "all", label: "Все" },
                  { value: "errors", label: `Ошибки (${wrong})` },
                ]}
              />
            )}
          </Group>
          {sections.map((section) => (
            <SectionSheet
              key={section.title + section.items[0].answer.questionId}
              title={section.title}
              items={section.items}
              errorsOnly={filter === "errors"}
            />
          ))}
        </>
      )}
    </Stack>
  );
}

export function AttemptModal({ attemptId, onClose }: { attemptId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => resultsApi.detail(attemptId ?? ""),
    enabled: Boolean(attemptId),
  });
  const media = useMemo<MediaResolver>(
    () => ({ asset: teacherMediaUrl, recording: (id) => recordingUrl(attemptId ?? "", id) }),
    [attemptId],
  );
  const saved = (next: AttemptDetail) => {
    queryClient.setQueryData(["attempt", attemptId], next);
    void queryClient.invalidateQueries({ queryKey: ["results"] });
  };
  const attempt = detail.data;

  return (
    <Modal
      opened={Boolean(attemptId)}
      onClose={onClose}
      size="var(--grid-cols-5-10-width)"
      title={attempt ? (
        <Group gap="sm" wrap="nowrap">
          <Text span size="lg" fw={700}>{attempt.participantName || "Участник без имени"}</Text>
          <StatusBadge status={attempt.status} />
        </Group>
      ) : "Попытка"}
    >
      {detail.isLoading && <Loading />}
      {detail.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(detail.error, "Попытка не найдена")}</Alert>
      )}
      {attempt && (
        <MediaProvider value={media}>
          <AttemptBody key={attempt.id} attempt={attempt} onSaved={saved} />
        </MediaProvider>
      )}
    </Modal>
  );
}
