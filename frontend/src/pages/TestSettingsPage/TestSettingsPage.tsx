import {
  Anchor,
  AppShell,
  Box,
  Button,
  NavLink,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  IconAdjustments,
  IconClock,
  IconKey,
  IconTrophy,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import type { Question } from "@/entities/question/types";
import { withNormalizedSettings } from "@/entities/test/settings";
import type { ExamTest } from "@/entities/test/types";
import { ApiError, errorMessage } from "@/shared/api/client";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { SaveIndicator, type SaveState } from "@/shared/ui/SaveIndicator";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { numberQuestionsInTest } from "@/features/question-types/numbering";
import { typeLabel } from "@/features/question-types/registry";
import { BuilderBar } from "@/features/test-builder/BuilderBar";
import { TestForm } from "@/features/test-builder/TestForm";
import { orderedQuestions, sectionParts } from "@/features/test-builder/sectionParts";
import { useTestMeta } from "@/features/test-builder/useTestMeta";
import { WorkspaceSwitch } from "@/features/test-builder/WorkspaceSwitch";
import { formatAnswerKeyLines } from "@/features/test-settings/formatAnswerKey";
import { primaryScoreField, questionMaxScore } from "@/features/test-settings/scoreUtils";
import { testsApi } from "@/features/tests/testsApi";
import { SidebarLogo } from "@/shared/ui/SidebarLogo";
import { sidebarNavLinkProps } from "@/shared/ui/sidebarNav";

const TAB_ITEMS: { id: "general" | "time" | "scoring" | "keys"; label: string; icon: TablerIcon }[] = [
  { id: "general", label: "Общие", icon: IconAdjustments },
  { id: "time", label: "Время", icon: IconClock },
  { id: "scoring", label: "Баллы", icon: IconTrophy },
  { id: "keys", label: "Ключи", icon: IconKey },
];

type TabId = (typeof TAB_ITEMS)[number]["id"];

const OFFICIAL_EXAMS = new Set(["IELTS", "TOEFL", "TOEIC"]);

function resolveTab(value: string | null): TabId {
  if (value === "profile" || value === "template" || value === "scale") {
    return "general";
  }
  return TAB_ITEMS.some((item) => item.id === value) ? (value as TabId) : "general";
}

export function TestSettingsPage() {
  const { testId = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: TabId = resolveTab(params.get("tab"));
  const queryClient = useQueryClient();
  const testQuery = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => withNormalizedSettings(await testsApi.get(testId)),
  });
  const test = testQuery.data;
  const setTest = useCallback((next: ExamTest) => {
    queryClient.setQueryData(["test", testId], withNormalizedSettings(next));
    void queryClient.invalidateQueries({ queryKey: ["tests"] });
  }, [queryClient, testId]);
  const meta = useTestMeta(test, setTest);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (meta.error) {
      notify.error(meta.error, { id: "meta-error", title: "Метаданные" });
    }
  }, [meta.error]);

  const setTab = (next: TabId) => {
    const copy = new URLSearchParams(params);
    if (next === "general") {
      copy.delete("tab");
    } else {
      copy.set("tab", next);
    }
    setParams(copy, { replace: true });
  };

  const flushMeta = async () => meta.flush();

  const preview = async () => {
    if (await flushMeta()) {
      window.open(`/teacher/tests/${testId}/preview`, "_blank", "noopener");
    }
  };

  const publish = async () => {
    if (!(await flushMeta())) {
      notify.warning("Перед публикацией сохраните изменения");
      return;
    }
    setPublishing(true);
    try {
      setTest(await testsApi.publish(testId));
      notify.success("Тест опубликован");
    } catch (failure) {
      notify.error(errorMessage(failure, "Не удалось опубликовать тест"), { title: "Публикация" });
      const questionId = failure instanceof ApiError ? failure.fields.questionId : undefined;
      if (questionId) {
        navigate(`/teacher/tests/${testId}?focus=${questionId}`);
      }
    } finally {
      setPublishing(false);
    }
  };

  if (testQuery.isLoading) {
    return (
      <Box mih="100vh" bg="gray.0">
        <Loading fullPage text="Загрузка настроек…" />
      </Box>
    );
  }
  if (testQuery.isError || !test) {
    return (
      <Box mih="100vh" bg="gray.0" p="xl">
        <Stack gap="md" maw={420}>
          <Title order={3}>Тест не открылся</Title>
          <Text c="dimmed">{errorMessage(testQuery.error, "Тест не найден или недоступен")}</Text>
          <Button component={Link} to="/teacher/tests" variant="default">К списку тестов</Button>
        </Stack>
      </Box>
    );
  }

  const officialExam = OFFICIAL_EXAMS.has(test.settings.examType ?? "CUSTOM");
  const tabs = officialExam ? TAB_ITEMS.filter((item) => item.id !== "scoring") : TAB_ITEMS;
  const activeTab: TabId = officialExam && tab === "scoring" ? "general" : tab;
  const currentLabel = tabs.find((item) => item.id === activeTab)?.label ?? "Общие";

  return (
    <Box mih="100vh" bg="gray.0">
      <AppShell
        layout="alt"
        header={{ height: "var(--chrome-header-height)" }}
        navbar={{ width: "var(--sidebar-width)", breakpoint: "sm" }}
        padding={0}
        styles={{
          root: { minHeight: "100vh", background: "var(--mantine-color-gray-0)" },
          main: { background: "var(--mantine-color-gray-0)", minHeight: "calc(100vh - 64px)" },
          header: { background: "var(--mantine-color-body)", overflow: "visible", zIndex: 100, boxShadow: "var(--shadow-chrome)" },
          navbar: { background: "var(--color-primary)", height: "100vh" },
        }}
        withBorder={false}
      >
        <AppShell.Header px={0}>
          <BuilderBar
            test={test}
            workspace="settings"
            publishing={publishing}
            onPreview={() => void preview()}
            onPublish={() => void publish()}
            save={<SaveIndicator state={meta.state as SaveState} />}
            showFormatToolbar={false}
          />
        </AppShell.Header>
        <AppShell.Navbar p={0} withBorder={false} className="iba-sidebar">
          <Stack h="100%" gap={0}>
            <SidebarLogo />
            <Box
              px="md"
              py="sm"
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <WorkspaceSwitch testId={test.id} workspace="settings" />
            </Box>
            <Stack gap={4} px="md" pb="sm" style={{ flex: 1, overflow: "auto" }}>
              {tabs.map((item) => {
                const TabIcon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    {...sidebarNavLinkProps}
                    styles={{ ...sidebarNavLinkProps.styles, label: { fontWeight: 600 } }}
                    label={item.label}
                    leftSection={<TabIcon size={16} stroke={1.5} aria-hidden />}
                    active={activeTab === item.id}
                    onClick={() => setTab(item.id)}
                  />
                );
              })}
            </Stack>
          </Stack>
        </AppShell.Navbar>
        <AppShell.Main style={{ paddingBottom: 0 }}>
          <Stack
            h="100%"
            gap={0}
            className="iba-grid-cols-5-10"
            style={{
              width: "var(--grid-cols-5-10-width)",
              maxWidth: "100%",
              marginLeft: "calc(var(--grid-col-start-5) - var(--app-shell-navbar-width, var(--sidebar-width)))",
              marginRight: "auto",
            }}
          >
            <Box
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                height: 65,
                background: "var(--mantine-color-gray-0)",
              }}
            >
              <Title order={2} style={{ lineHeight: 1 }}>{currentLabel}</Title>
            </Box>
            <Stack gap="sm" pb="var(--page-pad-bottom)" style={{ flex: 1, overflow: "auto" }}>
              {activeTab === "general" && <TestForm test={test} onChange={meta.change} />}
              {activeTab === "time" && <TimeTab test={test} setTest={setTest} onMeta={meta.change} />}
              {activeTab === "scoring" && <ScoringTab test={test} setTest={setTest} />}
              {activeTab === "keys" && <KeysTab test={test} />}
            </Stack>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </Box>
  );
}

function questionTimeLabel(
  question: Question,
  numbers: Map<string, { start: number; end: number; count: number }>,
) {
  const entry = numbers.get(question.id);
  if (!entry) {
    return typeLabel(question.type);
  }
  const range = entry.count <= 1 ? String(entry.start) : `${entry.start}-${entry.end}`;
  return `${range} · ${typeLabel(question.type)}`;
}

function TimeLimitRow({
  label,
  value,
  unit,
  max,
  pl,
  fw,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  unit: "мин" | "сек";
  max: number;
  pl?: string | number;
  fw?: number;
  onChange: (next: number | null) => void;
}) {
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="nowrap" pl={pl}>
      <Text size="sm" fw={fw} truncate style={{ minWidth: 0, flex: 1 }}>{label}</Text>
      <NumberInput
        size="sm"
        value={value ?? ""}
        min={0}
        max={max}
        placeholder={unit}
        aria-label={`${label}, ${unit}`}
        style={{ flex: "0 0 110px" }}
        onChange={(next) => {
          onChange(typeof next === "number" && next > 0 ? next : null);
        }}
      />
    </Group>
  );
}

function TimeTab({
  test,
  setTest,
  onMeta,
}: {
  test: ExamTest;
  setTest: (test: ExamTest) => void;
  onMeta: ReturnType<typeof useTestMeta>["change"];
}) {
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkSeconds, setBulkSeconds] = useState<number | string>("");
  const [applying, setApplying] = useState(false);

  const numbered = useMemo(
    () => numberQuestionsInTest(test.sections, test.settings.questionNumberScope ?? "test", test.settings.examType ?? "CUSTOM"),
    [test.sections, test.settings.questionNumberScope],
  );

  const numbers = useMemo(
    () => new Map(numbered.map((entry) => [entry.question.id, entry])),
    [numbered],
  );

  const byNumber = useMemo(() => {
    const map = new Map<number, Question>();
    for (const entry of numbered) {
      for (let n = entry.start; n <= entry.end; n += 1) {
        map.set(n, entry.question);
      }
    }
    return map;
  }, [numbered]);

  const applyBulk = async () => {
    if (applying) return;
    const parsed = parseQuestionNumbers(bulkNumbers);
    if (parsed.error) {
      notify.warning(parsed.error, { title: "Время" });
      return;
    }
    const next = typeof bulkSeconds === "number" && bulkSeconds > 0 ? bulkSeconds : null;
    const targets = new Map<string, Question>();
    const missing: number[] = [];
    for (const number of parsed.numbers) {
      const question = byNumber.get(number);
      if (!question) {
        missing.push(number);
        continue;
      }
      targets.set(question.id, question);
    }
    if (missing.length > 0) {
      notify.warning(`Нет вопросов с номерами: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`, { title: "Время" });
      return;
    }
    if (targets.size === 0) {
      notify.warning("Нет подходящих вопросов", { title: "Время" });
      return;
    }
    setApplying(true);
    try {
      let current = test;
      for (const target of targets.values()) {
        const question = current.sections
          .flatMap((section) => section.questions)
          .find((item) => item.id === target.id);
        if (!question) continue;
        current = await testsApi.updateQuestion(test.id, {
          ...question,
          settings: { ...question.settings, timeLimitSeconds: next },
        });
      }
      setTest(current);
      setBulkNumbers("");
      setBulkSeconds("");
      const count = targets.size;
      notify.success(
        next === null
          ? `Лимит снят с ${count} задани${count === 1 ? "я" : "й"}`
          : `${next} сек применено к ${count} задани${count === 1 ? "ю" : "ям"}`,
        { title: "Время" },
      );
    } catch (failure) {
      notify.error(errorMessage(failure, "Не удалось применить лимиты"), { title: "Время" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Stack gap="sm">
      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>Общий лимит</SettingsSectionTitle>
          <SettingsHint>
            Пустое поле – без ограничения по времени. Лимиты теста, секции, части и задания считаются отдельно
            и не заменяют друг друга. Если к заданию или блоку материалов прикреплено аудио, отсчёт времени
            задания начнётся после прослушивания
          </SettingsHint>
          <NumberInput
            label="Время на весь тест"
            value={test.settings.timeLimitMinutes ?? ""}
            min={0}
            max={600}
            placeholder="мин"
            w="100%"
            onChange={(value) => {
              const minutes = typeof value === "number" && value > 0 ? value : null;
              onMeta({ settings: { ...test.settings, timeLimitMinutes: minutes } }, 600);
            }}
          />
          {numbered.length > 0 && (
            <Group gap="md" align="flex-end" wrap="wrap">
              <TextInput
                label="Задания"
                placeholder="например, 1 3-5 7"
                value={bulkNumbers}
                onChange={(event) => setBulkNumbers(event.currentTarget.value)}
                style={{ flex: "1 1 260px", minWidth: 200 }}
              />
              <NumberInput
                label="Секунды"
                value={bulkSeconds}
                min={0}
                max={3600}
                placeholder="пусто"
                style={{ flex: "0 1 140px", minWidth: 120 }}
                onChange={setBulkSeconds}
              />
              <Button loading={applying} onClick={() => void applyBulk()}>
                Применить
              </Button>
            </Group>
          )}
        </Stack>
      </SettingsCard>

      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>По структуре</SettingsSectionTitle>
          <Stack gap="sm">
            {test.sections.map((section) => {
              const parts = sectionParts(section);
              const ordered = orderedQuestions(section);
              const sectionQuestions = parts.length === 0
                ? ordered
                : ordered.filter((question) => !question.partId);

              return (
                <Stack key={section.id} gap="sm">
                  <TimeLimitRow
                    label={`Секция · ${section.title}`}
                    value={section.timeLimitMinutes}
                    unit="мин"
                    max={600}
                    fw={600}
                    onChange={(minutes) => {
                      void testsApi.updateSection(test.id, section.id, {
                        title: section.title,
                        instructions: section.instructions,
                        sectionType: section.sectionType,
                        timeLimitMinutes: minutes,
                        items: section.items,
                      }).then(setTest);
                    }}
                  />

                  {parts.map((part) => (
                    <Stack key={part.id} gap="sm">
                      <TimeLimitRow
                        label={`Часть · ${part.title}`}
                        value={part.timeLimitMinutes}
                        unit="мин"
                        max={600}
                        pl="md"
                        fw={600}
                        onChange={(minutes) => {
                          void testsApi.updatePart(test.id, section.id, part.id, {
                            title: part.title,
                            instructions: part.instructions,
                            timeLimitMinutes: minutes ?? 0,
                            items: part.items,
                          }).then(setTest);
                        }}
                      />
                      {ordered
                        .filter((question) => question.partId === part.id)
                        .map((question) => (
                          <TimeLimitRow
                            key={question.id}
                            label={questionTimeLabel(question, numbers)}
                            value={question.settings.timeLimitSeconds}
                            unit="сек"
                            max={3600}
                            pl="xl"
                            fw={500}
                            onChange={(seconds) => {
                              void testsApi.updateQuestion(test.id, {
                                ...question,
                                settings: { ...question.settings, timeLimitSeconds: seconds },
                              }).then(setTest);
                            }}
                          />
                        ))}
                    </Stack>
                  ))}

                  {sectionQuestions.map((question) => (
                    <TimeLimitRow
                      key={question.id}
                      label={questionTimeLabel(question, numbers)}
                      value={question.settings.timeLimitSeconds}
                      unit="сек"
                      max={3600}
                      pl="md"
                      fw={500}
                      onChange={(seconds) => {
                        void testsApi.updateQuestion(test.id, {
                          ...question,
                          settings: { ...question.settings, timeLimitSeconds: seconds },
                        }).then(setTest);
                      }}
                    />
                  ))}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </SettingsCard>
    </Stack>
  );
}

function parseQuestionNumbers(input: string): { numbers: number[]; error?: string } {
  const tokens = input.trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { numbers: [], error: "Укажите номера вопросов" };
  }
  const numbers = new Set<number>();
  for (const token of tokens) {
    const range = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(token);
    if (range) {
      let from = Number(range[1]);
      let to = Number(range[2]);
      if (from > to) {
        [from, to] = [to, from];
      }
      for (let n = from; n <= to; n += 1) {
        numbers.add(n);
      }
      continue;
    }
    if (/^\d+$/.test(token)) {
      numbers.add(Number(token));
      continue;
    }
    return { numbers: [], error: `Неверный фрагмент: «${token}»` };
  }
  return { numbers: [...numbers].sort((a, b) => a - b) };
}

function ScoringTab({ test, setTest }: { test: ExamTest; setTest: (test: ExamTest) => void }) {
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkValue, setBulkValue] = useState<number | string>(1);
  const [applying, setApplying] = useState(false);

  const rows = useMemo(() => {
    const numbered = numberQuestionsInTest(test.sections, test.settings.questionNumberScope ?? "test", test.settings.examType ?? "CUSTOM");
    return numbered.flatMap(({ question, start, count }) => {
      const field = primaryScoreField(question);
      const current = field ? Number((question.scoringConfig as Record<string, unknown>)[field.key] ?? 0) : null;
      return Array.from({ length: count }, (_, index) => ({
        key: `${question.id}-${start + index}`,
        number: start + index,
        question,
        field,
        current,
      }));
    });
  }, [test.sections, test.settings.questionNumberScope]);

  const byNumber = useMemo(() => {
    const map = new Map<number, Question>();
    for (const row of rows) {
      map.set(row.number, row.question);
    }
    return map;
  }, [rows]);

  const applyBulk = async () => {
    if (applying) return;
    const parsed = parseQuestionNumbers(bulkNumbers);
    if (parsed.error) {
      notify.warning(parsed.error, { title: "Баллы" });
      return;
    }
    const next = typeof bulkValue === "number" ? bulkValue : 0;
    const targets = new Map<string, Question>();
    const missing: number[] = [];
    const skipped: number[] = [];
    for (const number of parsed.numbers) {
      const question = byNumber.get(number);
      if (!question) {
        missing.push(number);
        continue;
      }
      if (!primaryScoreField(question)) {
        skipped.push(number);
        continue;
      }
      targets.set(question.id, question);
    }
    if (missing.length > 0) {
      notify.warning(`Нет вопросов с номерами: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`, { title: "Баллы" });
      return;
    }
    if (targets.size === 0) {
      notify.warning("Нет подходящих вопросов", { title: "Баллы" });
      return;
    }
    setApplying(true);
    try {
      let current = test;
      for (const target of targets.values()) {
        const question = current.sections
          .flatMap((section) => section.questions)
          .find((item) => item.id === target.id);
        if (!question) continue;
        const field = primaryScoreField(question);
        if (!field) continue;
        current = await testsApi.updateQuestion(test.id, {
          ...question,
          scoringConfig: { ...question.scoringConfig, [field.key]: next },
        });
      }
      setTest(current);
      setBulkNumbers("");
      setBulkValue("");
      const count = targets.size;
      notify.success(`Значение ${next} применено к ${count} задани${count === 1 ? "ю" : "ям"}`, { title: "Баллы" });
    } catch (failure) {
      notify.error(errorMessage(failure, "Не удалось применить баллы"), { title: "Баллы" });
    } finally {
      setApplying(false);
    }
  };

  const numbered = useMemo(
    () => numberQuestionsInTest(test.sections, test.settings.questionNumberScope ?? "test", test.settings.examType ?? "CUSTOM"),
    [test.sections, test.settings.questionNumberScope],
  );
  const numbers = useMemo(
    () => new Map(numbered.map((entry) => [entry.question.id, entry])),
    [numbered],
  );
  const hasEditable = numbered.some(({ question }) => primaryScoreField(question));

  const sumScore = (questions: Question[]) =>
    questions.reduce((sum, question) => sum + questionMaxScore(question), 0);

  const formatSum = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  };

  return (
    <Stack gap="sm">
      {hasEditable && (
        <SettingsCard>
          <Stack gap="md">
            <SettingsSectionTitle>Массово</SettingsSectionTitle>
            <Group gap="md" align="flex-end" wrap="wrap">
              <TextInput
                label="Вопросы"
                withAsterisk
                placeholder="например, 1 3-5 7"
                value={bulkNumbers}
                onChange={(event) => setBulkNumbers(event.currentTarget.value)}
                style={{ flex: "1 1 260px", minWidth: 200 }}
              />
              <NumberInput
                label="Значение"
                withAsterisk
                value={bulkValue}
                min={0}
                max={1000}
                decimalScale={2}
                step={0.5}
                style={{ flex: "0 1 140px", minWidth: 120 }}
                onChange={setBulkValue}
              />
              <Button loading={applying} onClick={() => void applyBulk()}>
                Применить
              </Button>
            </Group>
          </Stack>
        </SettingsCard>
      )}
      <SettingsCard>
        <Stack gap="md">
          <SettingsSectionTitle>По структуре</SettingsSectionTitle>
          {numbered.length === 0 ? (
            <SettingsHint>В тесте пока нет заданий</SettingsHint>
          ) : (
            <Stack gap="sm">
              {test.sections.map((section) => {
                const parts = sectionParts(section);
                const ordered = orderedQuestions(section);
                const sectionQuestions = parts.length === 0
                  ? ordered
                  : ordered.filter((question) => !question.partId);
                const sectionTotal = sumScore(ordered);

                return (
                  <Stack key={section.id} gap="sm">
                    <ScoreSumRow
                      label={`Секция · ${section.title}`}
                      sum={formatSum(sectionTotal)}
                      fw={600}
                    />

                    {parts.map((part) => {
                      const partQuestions = ordered.filter((question) => question.partId === part.id);
                      return (
                        <Stack key={part.id} gap="sm">
                          <ScoreSumRow
                            label={`Часть · ${part.title}`}
                            sum={formatSum(sumScore(partQuestions))}
                            pl="md"
                            fw={600}
                          />
                          {partQuestions.map((question) => (
                            <ScoreQuestionRow
                              key={question.id}
                              testId={test.id}
                              question={question}
                              label={questionTimeLabel(question, numbers)}
                              pl="xl"
                              onSaved={setTest}
                            />
                          ))}
                        </Stack>
                      );
                    })}

                    {sectionQuestions.map((question) => (
                      <ScoreQuestionRow
                        key={question.id}
                        testId={test.id}
                        question={question}
                        label={questionTimeLabel(question, numbers)}
                        pl="md"
                        onSaved={setTest}
                      />
                    ))}
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SettingsCard>
    </Stack>
  );
}

function ScoreSumRow({
  label,
  sum,
  pl,
  fw,
}: {
  label: string;
  sum: string;
  pl?: string | number;
  fw?: number;
}) {
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="nowrap" pl={pl}>
      <Text size="sm" fw={fw} truncate style={{ minWidth: 0, flex: 1 }}>{label}</Text>
      <Text size="sm" fw={fw} style={{ flex: "0 0 110px", textAlign: "right" }}>{sum}</Text>
    </Group>
  );
}

function ScoreQuestionRow({
  testId,
  question,
  label,
  pl,
  onSaved,
}: {
  testId: string;
  question: Question;
  label: string;
  pl?: string | number;
  onSaved: (test: ExamTest) => void;
}) {
  const field = primaryScoreField(question);
  const current = field ? Number((question.scoringConfig as Record<string, unknown>)[field.key] ?? 0) : null;
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="nowrap" pl={pl}>
      <Text size="sm" fw={500} truncate style={{ minWidth: 0, flex: 1 }}>{label}</Text>
      {field ? (
        <NumberInput
          size="sm"
          value={current ?? 0}
          min={0}
          max={1000}
          decimalScale={2}
          step={0.5}
          aria-label={`${label}, ${field.label}`}
          style={{ flex: "0 0 110px" }}
          onChange={(value) => {
            const next = typeof value === "number" ? value : 0;
            void testsApi.updateQuestion(testId, {
              ...question,
              scoringConfig: { ...question.scoringConfig, [field.key]: next },
            }).then(onSaved);
          }}
        />
      ) : (
        <Text size="sm" c="dimmed" style={{ flex: "0 0 110px", textAlign: "right" }}>–</Text>
      )}
    </Group>
  );
}

function KeysTab({ test }: { test: ExamTest }) {
  const lines = useMemo(() => {
    const numbered = numberQuestionsInTest(test.sections, test.settings.questionNumberScope ?? "test", test.settings.examType ?? "CUSTOM");
    return numbered.flatMap(({ question, start }) =>
      formatAnswerKeyLines(question, start).map((line) => ({
        ...line,
        toBuilder: `/teacher/tests/${test.id}#builder-question-${question.id}`,
      })),
    );
  }, [test.id, test.sections, test.settings.questionNumberScope]);

  const columnCount = 4;
  const splitAt = Math.ceil(lines.length / columnCount) || 1;
  const columns = Array.from({ length: columnCount }, (_, index) =>
    lines.slice(index * splitAt, (index + 1) * splitAt),
  ).filter((column) => column.length > 0);

  return (
    <SettingsCard>
      <Stack gap="md">
        <SettingsSectionTitle>Ответы</SettingsSectionTitle>
        {lines.length === 0 ? (
          <SettingsHint>В тесте пока нет заданий</SettingsHint>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            {columns.map((column, columnIndex) => (
              <Stack key={columnIndex} gap="sm">
                {column.map((line) => (
                  <Group key={`${line.questionId}-${line.number}`} gap="sm" wrap="nowrap" align="flex-start">
                    <Anchor component={Link} to={line.toBuilder} size="sm" fw={600} style={{ flex: "0 0 auto" }}>
                      {line.number}
                    </Anchor>
                    {line.incomplete ? (
                      <Text size="sm" fw={500} c="dimmed" fs="italic">не задан</Text>
                    ) : (
                      <Text size="sm" fw={500} style={{ minWidth: 0 }}>{line.text}</Text>
                    )}
                  </Group>
                ))}
              </Stack>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </SettingsCard>
  );
}
