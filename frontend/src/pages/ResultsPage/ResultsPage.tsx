import { Alert, Button, Group, Popover, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HeaderSlotContext } from "@/app/layout/headerSlot";
import type { AttemptStatus } from "@/entities/attempt/types";
import { AttemptModal } from "@/features/results/AttemptModal";
import { resultsApi } from "@/features/results/resultsApi";
import { formatNumber, scoreScalesApi } from "@/features/score-scales/scoreScale";
import { testsApi } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { formatDateTime, formatScore } from "@/shared/lib/format";
import { useDebounced } from "@/shared/lib/useDebounced";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { IconButton } from "@/shared/ui/IconButton";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Select } from "@/shared/ui/Select";
import { Pagination } from "@/shared/ui/Pagination";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { COL } from "@/shared/ui/tableCols";
import { TablePanel } from "@/shared/ui/TablePanel";

const SIZE = 20;

export function ResultsPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.toString() ? `?${params.toString()}` : "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const search = useDebounced(q.trim());
  const testId = params.get("testId") ?? "";
  const status = (params.get("status") ?? "") as AttemptStatus | "";
  const level = params.get("level") ?? "";
  const page = Number(params.get("page") ?? 0);
  const headerSlot = useContext(HeaderSlotContext);
  const queryClient = useQueryClient();
  const tests = useQuery({ queryKey: ["tests", "all"], queryFn: () => testsApi.list({ size: 200 }) });
  const scales = useQuery({ queryKey: ["score-scales"], queryFn: scoreScalesApi.list });
  const levelOptions = [...new Set((scales.data ?? []).flatMap((scale) => scale.levels.map((item) => item.label)))];
  const list = useQuery({
    queryKey: ["results", { search, testId, status, level, page }],
    queryFn: () => resultsApi.list({ q: search, testId, status, level, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });

  const send = useMutation({
    mutationFn: (attemptId: string) => resultsApi.sendResult(attemptId),
    onSuccess: () => {
      notify.success("Результат отправлен на почту");
      void queryClient.invalidateQueries({ queryKey: ["results"] });
    },
    onError: (error) => notify.error(errorMessage(error, "Письмо не отправлено")),
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") {
      next.delete("page");
    }
    setParams(next, { replace: true });
  };

  const items = list.data?.items ?? [];
  const filtersActive = Boolean(testId || status || level);
  const withScale = items.some((attempt) => attempt.scaleTotal != null || attempt.scaleLevel);
  const filtered = Boolean(search || filtersActive);

  const searchField = (
    <TextInput
      aria-label="Поиск по участнику"
      placeholder="Поиск по участнику"
      value={q}
      w="var(--grid-col-span-3-width)"
      leftSection={<Icon name="search" />}
      leftSectionPointerEvents="none"
      onChange={(event) => {
        setQ(event.currentTarget.value);
        setParam("q", event.currentTarget.value.trim());
      }}
    />
  );

  return (
    <Stack gap="sm">
      {headerSlot ? createPortal(searchField, headerSlot) : null}
      <PageHeader
        title="Результаты"
        actions={
          <Popover width={280} position="bottom-end" shadow="md">
            <Popover.Target>
              <Button
                variant={filtersActive ? "light" : "subtle"}
                color={filtersActive ? "iba" : "gray"}
                leftSection={<Icon name="filter" />}
              >
                Фильтр
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="sm">
                <Select
                  size="sm"
                  label="Тест"
                  value={testId}
                  withinPortal={false}
                  onChange={(next) => setParam("testId", next)}
                  options={[
                    { value: "", label: "Все тесты" },
                    ...(tests.data?.items.map((test) => ({ value: test.id, label: test.title })) ?? []),
                  ]}
                />
                <Select
                  size="sm"
                  label="Статус"
                  value={status}
                  withinPortal={false}
                  onChange={(next) => setParam("status", next)}
                  options={[
                    { value: "", label: "Все статусы" },
                    { value: "NEEDS_REVIEW", label: "Ждут проверки" },
                    { value: "AUTO_GRADED", label: "Проверены автоматически" },
                    { value: "REVIEWED", label: "Проверены" },
                    { value: "IN_PROGRESS", label: "В процессе" },
                  ]}
                />
                {levelOptions.length > 0 && (
                  <Select
                    size="sm"
                    label="Уровень"
                    value={level}
                    withinPortal={false}
                    onChange={(next) => setParam("level", next)}
                    options={[{ value: "", label: "Все уровни" }, ...levelOptions.map((label) => ({ value: label, label }))]}
                  />
                )}
                <Button
                  variant="subtle"
                  size="compact-sm"
                  disabled={!filtersActive}
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("testId");
                    next.delete("status");
                    next.delete("level");
                    next.delete("page");
                    setParams(next, { replace: true });
                  }}
                >
                  Сбросить фильтр
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        }
      />

      {list.isLoading && <Loading />}
      {list.isError && (
        <Alert color="red" variant="light" role="alert">{errorMessage(list.error, "Не удалось загрузить результаты")}</Alert>
      )}
      {list.data && items.length === 0 && (
        <EmptyState title={filtered ? "Ничего не найдено" : "Результатов пока нет"}>
          {filtered
            ? "Измените запрос или фильтры"
            : "Результаты появятся, когда участники пройдут опубликованный тест по ссылке"}
        </EmptyState>
      )}
      {items.length > 0 && (
        <TablePanel>
          <Table.ScrollContainer minWidth={COL.name + COL.title + COL.status + COL.datetime + COL.score + COL.actionWide}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={COL.name}>Участник</Table.Th>
                  <Table.Th w={COL.title}>Тест</Table.Th>
                  <Table.Th w={COL.status} ta="center">Статус</Table.Th>
                  <Table.Th w={COL.datetime} ta="center">Отправлено</Table.Th>
                  <Table.Th w={COL.score} ta="center">Баллы</Table.Th>
                  {withScale && <Table.Th w={COL.score} ta="center">Уровень</Table.Th>}
                  <Table.Th w={COL.actionWide} ta="center">Действие</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((attempt) => (
                  <Table.Tr key={attempt.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text component={Link} to={`/teacher/results/${attempt.id}${query}`} fw={600} c="iba">
                          {attempt.participantName || "Без имени"}
                        </Text>
                        {attempt.participantEmail ? (
                          <Text size="sm" c="dimmed">{attempt.participantEmail}</Text>
                        ) : null}
                      </Stack>
                    </Table.Td>
                    <Table.Td fw={600} fz="md">{attempt.testTitle}</Table.Td>
                    <Table.Td ta="center"><StatusBadge status={attempt.status} /></Table.Td>
                    <Table.Td ta="center" fz="md">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "–"}</Table.Td>
                    <Table.Td ta="center" fz="md">{attempt.status === "IN_PROGRESS" ? "–" : formatScore(attempt.score, attempt.maxScore)}</Table.Td>
                    {withScale && (
                      <Table.Td ta="center" fz="md" fw={attempt.scaleLevel || attempt.scaleTotal != null ? 700 : undefined}>
                        {attempt.scaleLevel
                          ? `${attempt.scaleLevel}${attempt.scaleTotal != null ? ` (${formatNumber(attempt.scaleTotal)})` : ""}`
                          : attempt.scaleTotal != null ? formatNumber(attempt.scaleTotal) : "–"}
                      </Table.Td>
                    )}
                    <Table.Td ta="center">
                      <Group justify="center" gap="md" wrap="nowrap">
                        {attempt.status === "NEEDS_REVIEW" && (
                          <Button component={Link} to={`/teacher/results/${attempt.id}${query}`} variant="subtle" size="compact-sm">
                            Проверить
                          </Button>
                        )}
                        {attempt.participantEmail && attempt.resultReady ? (
                          <IconButton
                            size="lg"
                            color={attempt.resultEmailedAt ? "teal" : "iba"}
                            label={attempt.resultEmailedAt ? "Отправить результат снова" : "Отправить результат на почту"}
                            tooltip={attempt.resultEmailedAt
                              ? `Отправлен ${formatDateTime(attempt.resultEmailedAt)}. Отправить снова`
                              : "Отправить результат на почту"}
                            loading={send.isPending && send.variables === attempt.id}
                            onClick={() => send.mutate(attempt.id)}
                          >
                            <Icon name={attempt.resultEmailedAt ? "check" : "mail"} size={20} />
                          </IconButton>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </TablePanel>
      )}
      {list.data && <Pagination page={page} size={SIZE} total={list.data.total} onChange={(next) => setParam("page", String(next))} />}
      <AttemptModal attemptId={attemptId ?? null} onClose={() => navigate(`/teacher/results${query}`)} />
    </Stack>
  );
}
