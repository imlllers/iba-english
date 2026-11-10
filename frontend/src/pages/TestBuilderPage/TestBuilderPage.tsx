import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ERROR_EXPLANATIONS_ENABLED } from "@/entities/test/settings";
import type { Question, QuestionType } from "@/entities/question/types";
import type { ExamTest, MaterialBlock, Section, SectionPart } from "@/entities/test/types";
import { ApiError, errorMessage } from "@/shared/api/client";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { notify } from "@/shared/ui/notify";
import { SaveIndicator, type SaveState } from "@/shared/ui/SaveIndicator";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { QuestionEditor } from "@/features/question-types/QuestionEditor";
import { QuestionLivePreview } from "@/features/question-types/QuestionLivePreview";
import { formatQuestionsHeading, numberQuestionsByScope } from "@/features/question-types/numbering";
import { typeLabel } from "@/features/question-types/registry";
import { AddQuestionDialog } from "@/features/test-builder/AddQuestionDialog";
import { BuilderBar } from "@/features/test-builder/BuilderBar";
import { MaterialBlockForm } from "@/features/test-builder/MaterialBlockForm";
import { PartForm } from "@/features/test-builder/PartForm";
import { SectionForm } from "@/features/test-builder/SectionForm";
import { SectionsPanel } from "@/features/test-builder/SectionsPanel";
import { findBlock, findPart, hasParts, orderedQuestions, questionsOfBlock, sectionBlocks, sectionParts } from "@/features/test-builder/sectionParts";
import { useQuestionDraft } from "@/features/test-builder/useQuestionDraft";
import { useTestMeta } from "@/features/test-builder/useTestMeta";
import { testsApi } from "@/features/tests/testsApi";

function combine(first: SaveState, second: SaveState): SaveState {
  for (const state of ["error", "saving", "saved"] as SaveState[]) {
    if (first === state || second === state) {
      return state;
    }
  }
  return "idle";
}

function findQuestion(test: ExamTest, id: string) {
  for (const section of test.sections) {
    const question = section.questions.find((item) => item.id === id);
    if (question) {
      return { section, question };
    }
  }
  return null;
}

function questionIds(test: ExamTest) {
  return new Set(test.sections.flatMap((section) => section.questions.map((question) => question.id)));
}

type AnchorKind = "section" | "part" | "block" | "question";

const anchor = (kind: AnchorKind, id: string) => `builder-${kind}-${id}`;

function questionIdFromHash(hash: string): string | null {
  const match = /^#builder-question-([^#?]+)$/.exec(hash);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function TestBuilderPage() {
  return (
    <BuilderErrorBoundary>
      <TestBuilderPageInner />
    </BuilderErrorBoundary>
  );
}

class BuilderErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TestBuilder crash", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <Stack p="xl" maw={720} mx="auto" gap="md">
          <Title order={3}>Конструктор упал</Title>
          <Text c="red">{this.state.error.message}</Text>
          <Text component="pre" style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{this.state.error.stack}</Text>
        </Stack>
      );
    }
    return this.props.children;
  }
}

function TestBuilderPageInner() {
  const { testId = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const testQuery = useQuery({ queryKey: ["test", testId], queryFn: () => testsApi.get(testId) });
  const test = testQuery.data;

  const setTest = useCallback((next: ExamTest, refreshList = false) => {
    queryClient.setQueryData(["test", testId], next);
    if (refreshList) {
      void queryClient.invalidateQueries({ queryKey: ["tests"] });
    }
  }, [queryClient, testId]);

  const draft = useQuestionDraft(testId, setTest);
  const meta = useTestMeta(test, setTest);
  const [sectionId, setSectionId] = useState<string>();
  const [partId, setPartId] = useState<string>();
  const [blockId, setBlockId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [focusKind, setFocusKind] = useState<"question" | "section" | "part" | "block">("question");
  const [navQuestionId, setNavQuestionId] = useState<string>();
  const initialized = useRef(false);
  const appliedHash = useRef<string | null>(null);
  const activating = useRef<string | null>(null);
  const queued = useRef<{ id: string; patch: Partial<Question> }[]>([]);

  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, [focusKind, sectionId, partId, blockId, navQuestionId]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    const prevOverscroll = html.style.overscrollBehavior;
    html.style.background = "var(--mantine-color-body)";
    body.style.background = "var(--mantine-color-body)";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
      html.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const select = useCallback(async (section: Section, question: Question | null, nextPartId?: string | null, nextBlockId?: string | null) => {
    if (!(await draft.load(question))) {
      return false;
    }
    setSectionId(section.id);
    if (nextPartId !== undefined) {
      setPartId(nextPartId ?? undefined);
    } else if (question?.partId) {
      setPartId(question.partId);
    } else if (hasParts(section)) {
      setPartId(sectionParts(section)[0]?.id);
    } else {
      setPartId(undefined);
    }
    if (nextBlockId !== undefined) {
      setBlockId(nextBlockId ?? undefined);
    } else if (question?.materialBlockId) {
      setBlockId(question.materialBlockId);
    } else {
      setBlockId(undefined);
    }
    if (question) {
      setFocusKind("question");
      setNavQuestionId(question.id);
    } else {
      setNavQuestionId(undefined);
      setFocusKind("section");
    }
    return true;
  }, [draft]);

  useEffect(() => {
    if (!test) {
      return;
    }
    const fromHash = questionIdFromHash(location.hash);
    if (fromHash) {
      if (appliedHash.current === location.hash && initialized.current) {
        return;
      }
      const found = findQuestion(test, fromHash);
      if (found) {
        appliedHash.current = location.hash;
        initialized.current = true;
        void select(found.section, found.question).then(() => {
          requestAnimationFrame(() => {
            document.querySelector(`[data-nav-question="${found.question.id}"]`)?.scrollIntoView({ block: "nearest" });
          });
        });
        return;
      }
    }
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    const first = test.sections[0];
    if (first) {
      const questions = orderedQuestions(first);
      void select(first, questions[0] ?? null, hasParts(first) ? sectionParts(first)[0]?.id ?? null : null);
    }
  }, [test, select, location.hash]);

  const sectionsForNumbers = useMemo(
    () => (test?.sections ?? []).map((item) => ({
      ...item,
      questions: item.questions.map((question) => (question.id === draft.draft?.id ? draft.draft : question)),
    })),
    [test?.sections, draft.draft],
  );
  const examType = test?.settings.examType ?? "CUSTOM";
  const numbers = useMemo(
    () => numberQuestionsByScope(sectionsForNumbers, test?.settings.questionNumberScope ?? "test", examType),
    [sectionsForNumbers, test?.settings.questionNumberScope, examType],
  );

  useEffect(() => {
    if (draft.state === "error" && draft.error) {
      notify.error(`${draft.error}. Копия в браузере.`, { id: "draft-error", title: "Сохранение", autoClose: false });
    }
  }, [draft.state, draft.error]);

  useEffect(() => {
    if (meta.error) {
      notify.error(meta.error, { id: "meta-error", title: "Метаданные" });
    }
  }, [meta.error]);

  if (testQuery.isLoading) {
    return (
      <BuilderFrame>
        <Loading fullPage text="Загрузка теста…" />
      </BuilderFrame>
    );
  }
  if (testQuery.isError || !test) {
    return (
      <BuilderFrame>
        <Stack gap="md" maw={420} p="xl">
          <Title order={3}>Тест не открылся</Title>
          <Text c="dimmed">{errorMessage(testQuery.error, "Тест не найден или недоступен")}</Text>
          <Button component={Link} to="/teacher/tests" variant="default">К списку тестов</Button>
        </Stack>
      </BuilderFrame>
    );
  }

  const section = test.sections.find((item) => item.id === sectionId) ?? test.sections[0];
  const part = findPart(section, partId);
  const block = findBlock(section, blockId);
  const numberedSection = sectionsForNumbers.find((item) => item.id === section?.id) ?? section;
  const linkedBlockQuestions = block
    ? questionsOfBlock(numberedSection, block.id).map((question) => ({
        question,
        startNumber: numbers.get(question.id)?.start ?? 1,
      }))
    : [];
  const blockQuestionsHeading = (() => {
    if (!linkedBlockQuestions.length) return null;
    let start = Number.POSITIVE_INFINITY;
    let end = Number.NEGATIVE_INFINITY;
    for (const { question } of linkedBlockQuestions) {
      const entry = numbers.get(question.id);
      if (!entry) continue;
      start = Math.min(start, entry.start);
      end = Math.max(end, entry.end);
    }
    return Number.isFinite(start) ? formatQuestionsHeading(start, end) : null;
  })();
  const openQuestion = focusKind === "question"
    ? section?.questions.find((item) => item.id === navQuestionId)
    : undefined;
  const headerPart = focusKind === "question"
    ? findPart(section, openQuestion?.partId ?? undefined)
    : focusKind === "section"
      ? undefined
      : part;
  const partsMode = hasParts(section);
  const canAddQuestion = Boolean(section) && (!partsMode || Boolean(part));
  const canAddPart = Boolean(section);
  const canAddBlock = canAddQuestion;

  const act = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      return true;
    } catch (failure) {
      notify.error(errorMessage(failure, "Действие не выполнено"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAdded = async (next: ExamTest, before: Set<string>, targetSection: string) => {
    setTest(next);
    const created = next.sections.find((item) => item.id === targetSection)?.questions.find((item) => !before.has(item.id));
    const owner = next.sections.find((item) => item.id === targetSection);
    if (created && owner) {
      await select(owner, created);
    }
  };

  const activate = (owner: Section, question: Question) => {
    setNavQuestionId(question.id);
    setFocusKind("question");
    setBlockId(question.materialBlockId ?? undefined);
    setPartId(question.partId ?? undefined);
    setSectionId(owner.id);
    if (draft.draft?.id === question.id || activating.current === question.id) {
      return;
    }
    activating.current = question.id;
    void select(owner, question).then((loaded) => {
      if (activating.current !== question.id) {
        return;
      }
      activating.current = null;
      const patches = queued.current.filter((item) => item.id === question.id);
      queued.current = [];
      if (loaded) {
        patches.forEach((item) => draft.update(item.patch));
      }
    });
  };

  const activateSection = (owner: Section) => {
    setSectionId(owner.id);
    setFocusKind("section");
    setNavQuestionId(undefined);
  };

  const activatePart = (owner: Section, entry: SectionPart) => {
    setSectionId(owner.id);
    setPartId(entry.id);
    setBlockId(undefined);
    setFocusKind("part");
    setNavQuestionId(undefined);
  };

  const activateBlock = (owner: Section, item: MaterialBlock) => {
    setSectionId(owner.id);
    setPartId(item.partId ?? undefined);
    setBlockId(item.id);
    setFocusKind("block");
    setNavQuestionId(undefined);
  };

  const updateQuestion = (owner: Section, question: Question) => (patch: Partial<Question>) => {
    if (draft.draft?.id === question.id && activating.current === null) {
      draft.update(patch);
      return;
    }
    queued.current.push({ id: question.id, patch });
    activate(owner, question);
  };

  const addQuestion = (type: QuestionType, count: number) => {
    if (!section || (partsMode && !part)) {
      return;
    }
    void act(async () => {
      if (!(await draft.save())) {
        throw new Error("Сначала сохраните текущее задание");
      }
      const before = questionIds(test);
      await openAdded(
        await testsApi.addQuestion(test.id, section.id, type, count, part?.id ?? null, block?.id ?? null),
        before,
        section.id,
      );
      setAdding(false);
    });
  };

  const duplicateQuestion = (owner: Section, question: Question) => {
    void act(async () => {
      if (!(await draft.save())) {
        throw new Error("Сначала сохраните текущее задание");
      }
      const before = questionIds(test);
      await openAdded(await testsApi.duplicateQuestion(test.id, question.id), before, owner.id);
    });
  };

  const askDeleteQuestion = (source: Section, question: Question, label: string) => {
    modals.openConfirmModal({
      title: "Удалить задание?",
      children: <Text size="sm">Задание «{label}» будет удалено вместе с ответами.</Text>,
      labels: { confirm: "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void act(async () => {
          const scope = orderedQuestions(source).filter((item) => (item.partId ?? null) === (question.partId ?? null));
          const index = scope.findIndex((item) => item.id === question.id);
          const neighborId = (scope[index + 1] ?? scope[index - 1])?.id;
          if (draft.draft?.id === question.id) {
            draft.forget();
          }
          queued.current = queued.current.filter((item) => item.id !== question.id);
          const next = await testsApi.deleteQuestion(test.id, question.id);
          setTest(next);
          const owner = next.sections.find((item) => item.id === source.id);
          const neighbor = owner?.questions.find((item) => item.id === neighborId);
          if (owner && neighbor) {
            await select(owner, neighbor, neighbor.partId ?? null, neighbor.materialBlockId ?? null);
          } else if (owner) {
            setSectionId(owner.id);
            setPartId(question.partId ?? undefined);
            setBlockId(undefined);
            setNavQuestionId(undefined);
            setFocusKind(question.partId ? "part" : "section");
          }
        });
      },
    });
  };

  const askDeleteSection = (owner: Section) => {
    modals.openConfirmModal({
      title: "Удалить секцию?",
      children: (
        <Text size="sm">
          Секция «{owner.title || "Секция"}» будет удалена вместе с частями, группами вопросов и заданиями. Это нельзя отменить.
        </Text>
      ),
      labels: { confirm: "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void act(async () => {
          setTest(await testsApi.deleteSection(test.id, owner.id));
        });
      },
    });
  };

  const askDeletePart = (owner: Section, entry: SectionPart) => {
    const alone = sectionParts(owner).length === 1;
    modals.openConfirmModal({
      title: alone ? "Убрать части?" : "Удалить часть?",
      children: (
        <Text size="sm">
          {alone
            ? `Единственная часть «${entry.title || "Часть"}» будет убрана. Задания останутся в секции.`
            : `Часть «${entry.title || "Часть"}» будет удалена. Задания из неё останутся в секции без части.`}
        </Text>
      ),
      labels: { confirm: alone ? "Убрать" : "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void act(async () => {
          setTest(await testsApi.deletePart(test.id, owner.id, entry.id));
        });
      },
    });
  };

  const askDeleteBlock = (owner: Section, entry: MaterialBlock) => {
    const linked = questionsOfBlock(owner, entry.id).length;
    modals.openConfirmModal({
      title: "Удалить группу вопросов?",
      children: (
        <Text size="sm">
          {linked > 0
            ? `Группа будет удалена. Привязанные задания (${linked}) останутся в части / секции без группы.`
            : "Группа вопросов будет удалена. Это нельзя отменить."}
        </Text>
      ),
      labels: { confirm: "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void act(async () => {
          setTest(await testsApi.deleteMaterialBlock(test.id, owner.id, entry.id));
          if (blockId === entry.id) {
            setBlockId(undefined);
            setFocusKind(entry.partId ? "part" : "section");
          }
        });
      },
    });
  };

  const addPart = () => {
    if (!section) {
      return;
    }
    void act(async () => {
      if (!(await draft.save())) {
        throw new Error("Сначала сохраните текущее задание");
      }
      const before = new Set(sectionParts(section).map((item) => item.id));
      const next = await testsApi.addPart(test.id, section.id);
      setTest(next);
      const updated = next.sections.find((item) => item.id === section.id);
      if (!updated) {
        return;
      }
      const created = sectionParts(updated).find((item) => !before.has(item.id)) ?? sectionParts(updated).at(-1);
      setSectionId(updated.id);
      setPartId(created?.id);
      setBlockId(undefined);
      setFocusKind("part");
    });
  };

  const addMaterialBlock = () => {
    if (!section || (partsMode && !part)) {
      return;
    }
    void act(async () => {
      if (!(await draft.save())) {
        throw new Error("Сначала сохраните текущее задание");
      }
      const before = new Set(sectionBlocks(section).map((item) => item.id));
      const next = await testsApi.addMaterialBlock(test.id, section.id, part?.id ?? null);
      setTest(next);
      const updated = next.sections.find((item) => item.id === section.id);
      if (!updated) {
        return;
      }
      const created = sectionBlocks(updated).find((item) => !before.has(item.id)) ?? sectionBlocks(updated).at(-1);
      setSectionId(updated.id);
      setPartId(part?.id);
      setBlockId(created?.id);
      setFocusKind("block");
    });
  };

  const addSection = () => {
    void act(async () => {
      const before = new Set(test.sections.map((item) => item.id));
      const next = await testsApi.addSection(test.id, {
        title: `Section ${test.sections.length + 1}`,
        instructions: "",
        sectionType: "CUSTOM",
        timeLimitMinutes: null,
      });
      setTest(next);
      const created = next.sections.find((item) => !before.has(item.id));
      if (created) {
        setSectionId(created.id);
        setPartId(undefined);
        setBlockId(undefined);
        setFocusKind("section");
      }
    });
  };

  const flushAll = async () => (await draft.save()) && (await meta.flush());

  const preview = async () => {
    if (await flushAll()) {
      window.open(`/teacher/tests/${test.id}/preview`, "_blank", "noopener");
    }
  };

  const publish = async () => {
    if (!(await flushAll())) {
      notify.warning("Перед публикацией сохраните изменения");
      return;
    }
    setPublishing(true);
    try {
      setTest(await testsApi.publish(test.id), true);
      notify.success("Тест опубликован");
    } catch (failure) {
      notify.error(errorMessage(failure, "Не удалось опубликовать тест"), { title: "Публикация" });
      const questionId = failure instanceof ApiError ? failure.fields.questionId : undefined;
      const target = questionId ? findQuestion(test, questionId) : null;
      if (target) {
        await select(target.section, target.question);
      }
    } finally {
      setPublishing(false);
    }
  };

  const questionCard = (owner: Section, question: Question) => {
    const entry = numbers.get(question.id);
    const active = draft.draft?.id === question.id;
    const live = active && draft.draft ? draft.draft : question;
    const label = entry
      ? `${entry.count <= 1 ? entry.start : `${entry.start}-${entry.end}`} · ${typeLabel(question.type)}`
      : typeLabel(question.type);
    return (
      <Stack key={question.id} gap="sm" id={anchor("question", question.id)} data-builder-question={question.id}>
        <Card
          component="article"
          shadow="sm"
          bg="white"
          aria-label={label}
          onPointerDownCapture={(event) => {
            if (!(event.target as HTMLElement).closest("[data-card-action]")) activate(owner, question);
          }}
          onFocusCapture={(event) => {
            if (!(event.target as HTMLElement).closest("[data-card-action]")) activate(owner, question);
          }}
        >
          <Group justify="space-between" gap="md" mb="md" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Badge variant={active && focusKind === "question" ? "filled" : "light"} color="iba" size="md">
                {label}
              </Badge>
              {live.settings.timeLimitSeconds ? (
                <Badge variant="light" color="iba" size="md">
                  {live.settings.timeLimitSeconds} сек
                </Badge>
              ) : null}
            </Group>
            <Group gap="md" wrap="nowrap">
              <Tooltip label="Копировать задание">
                <ActionIcon
                  aria-label="Копировать задание"
                  data-card-action
                  disabled={busy}
                  onClick={() => duplicateQuestion(owner, question)}
                >
                  <Icon name="copy" />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Удалить задание">
                <ActionIcon
                  color="red"
                  aria-label="Удалить задание"
                  data-card-action
                  onClick={() => askDeleteQuestion(owner, question, label)}
                >
                  <Icon name="trash" />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <QuestionEditor
            key={live.id}
            question={live}
            update={updateQuestion(owner, live)}
            startNumber={entry?.start ?? 1}
            examType={examType}
            errorExplanationsEnabled={ERROR_EXPLANATIONS_ENABLED && (test.settings.errorExplanationMode ?? "off") !== "off"}
          />
        </Card>
        <QuestionLivePreview
          question={live}
          startNumber={entry?.start ?? 1}
          numberFormat={test.settings.questionNumberFormat}
          examType={examType}
        />
      </Stack>
    );
  };

  return (
    <BuilderFrame>
      <AppShell
        layout="alt"
        header={{ height: "var(--chrome-header-height)" }}
        navbar={{ width: "var(--sidebar-width)", breakpoint: "sm" }}
        padding={0}
        styles={{
          root: {
            height: "100vh",
            overflow: "hidden",
            background: "var(--mantine-color-body)",
            overscrollBehavior: "none",
          },
          main: {
            height: "calc(100vh - 64px)",
            overflow: "auto",
            background: "var(--mantine-color-gray-0)",
            overscrollBehavior: "none",
          },
          header: { background: "var(--mantine-color-body)", overflow: "visible", zIndex: 100, boxShadow: "var(--shadow-chrome)" },
          navbar: { height: "100vh", overflow: "hidden", background: "var(--color-primary)" },
        }}
        withBorder={false}
      >
        <AppShell.Header px={0}>
          <BuilderHeader
            test={test}
            publishing={publishing}
            onPreview={() => void preview()}
            onPublish={() => void publish()}
            save={<SaveIndicator state={combine(draft.state, meta.state)} />}
          />
        </AppShell.Header>
        <AppShell.Navbar p={0} withBorder={false}>
          <SectionsPanel
            test={{ ...test, sections: sectionsForNumbers }}
            workspace="builder"
            sectionId={section?.id}
            partId={part?.id}
            blockId={block?.id}
            questionId={focusKind === "question" ? navQuestionId : undefined}
            onSelectSection={(id) => {
              const target = test.sections.find((item) => item.id === id);
              if (!target) return;
              setSectionId(target.id);
              setPartId(undefined);
              setBlockId(undefined);
              setNavQuestionId(undefined);
              setFocusKind("section");
            }}
            onSelectPart={(nextSectionId, nextPartId) => {
              setSectionId(nextSectionId);
              setPartId(nextPartId);
              setBlockId(undefined);
              setNavQuestionId(undefined);
              setFocusKind("part");
            }}
            onSelectBlock={(nextSectionId, nextPartId, nextBlockId) => {
              setSectionId(nextSectionId);
              setPartId(nextPartId ?? undefined);
              setBlockId(nextBlockId);
              setNavQuestionId(undefined);
              setFocusKind("block");
            }}
            onSelectQuestion={(owner, question) => activate(owner, question)}
            onPlaceQuestion={(input) => {
              void act(async () => {
                if (!(await draft.save())) {
                  throw new Error("Сначала сохраните текущее задание");
                }
                const next = await testsApi.placeQuestion(test.id, input.sectionId, input.questionId, {
                  materialBlockId: input.materialBlockId,
                  beforeId: input.beforeId,
                  afterId: input.afterId,
                  partId: input.partId,
                });
                setTest(next);
                const owner = next.sections.find((item) => item.id === input.sectionId);
                const moved = owner?.questions.find((item) => item.id === input.questionId);
                if (owner && moved) {
                  await select(owner, moved, moved.partId ?? null, moved.materialBlockId ?? null);
                }
              });
            }}
            onAddQuestion={() => setAdding(true)}
            onAddPart={addPart}
            onAddBlock={addMaterialBlock}
            onAddSection={addSection}
            canAddQuestion={canAddQuestion}
            canAddPart={canAddPart}
            canAddBlock={canAddBlock}
          />
        </AppShell.Navbar>
        <AppShell.Main id="main" style={{ paddingBottom: 0 }}>
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
            {draft.backup && (
              <Paper
                component="aside"
                role="status"
                radius="md"
                shadow="sm"
                mb="sm"
                px="md"
                py="sm"
                style={{ flex: "none" }}
              >
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                  <Text size="sm" c="dimmed" style={{ flex: "1 1 12rem", minWidth: 0 }}>
                    В браузере есть черновик этого задания
                  </Text>
                  <Group gap="md" wrap="nowrap" style={{ flex: "none" }}>
                    <Button size="compact-sm" color="iba" onClick={draft.restoreBackup}>
                      Восстановить
                    </Button>
                    <Button size="compact-sm" variant="subtle" color="gray" onClick={draft.discardBackup}>
                      Отбросить
                    </Button>
                  </Group>
                </Group>
              </Paper>
            )}
            {test.sections.length === 0 ? (
              <Card maw={480} mt="xl">
                <Stack gap="md">
                  <Title order={3}>В тесте пока нет секций</Title>
                  <SettingsHint>Начните с секции – затем добавьте части, группы вопросов и задания</SettingsHint>
                  <Button leftSection={<Icon name="plus" />} onClick={addSection}>Добавить секцию</Button>
                </Stack>
              </Card>
            ) : section ? (
              <>
                <Box
                  style={{
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    height: 65,
                    background: "var(--mantine-color-gray-0)",
                  }}
                >
                  <Stack gap={4} data-section-head={section.title}>
                    <Group gap="sm" align="center" wrap="nowrap">
                      <Title order={2} style={{ lineHeight: 1 }}>{section.title}</Title>
                      {section.timeLimitMinutes ? (
                        <Badge variant="light" color="iba">{section.timeLimitMinutes} мин</Badge>
                      ) : null}
                    </Group>
                    {headerPart ? <Text c="dimmed" fw={600} size="sm">{headerPart.title}</Text> : null}
                  </Stack>
                </Box>
                <Stack gap="sm" pb="var(--page-pad-bottom)" style={{ flex: 1 }}>
                  {focusKind === "part" && part ? (
                    <PartForm
                      key={part.id}
                      part={part}
                      alone={sectionParts(section).length === 1}
                      examType={test.settings.examType ?? "CUSTOM"}
                      defaultOneQuestionPerPage={test.settings.oneQuestionPerPage ?? true}
                      focused
                      onActivate={() => activatePart(section, part)}
                      onSave={async (input) => setTest(await testsApi.updatePart(test.id, section.id, part.id, input))}
                      onDelete={() => askDeletePart(section, part)}
                    />
                  ) : focusKind === "block" && block ? (
                    <MaterialBlockForm
                      key={block.id}
                      block={block}
                      cardId={anchor("block", block.id)}
                      questionsHeading={blockQuestionsHeading}
                      linkedQuestions={linkedBlockQuestions}
                      numberFormat={test.settings.questionNumberFormat}
                      examType={examType}
                      onActivate={() => activateBlock(section, block)}
                      onSave={async (input) => setTest(await testsApi.updateMaterialBlock(test.id, section.id, block.id, input))}
                      onDelete={() => askDeleteBlock(section, block)}
                    />
                  ) : openQuestion ? (
                    questionCard(section, openQuestion)
                  ) : (
                    <SectionForm
                      key={section.id}
                      section={section}
                      total={test.sections.length}
                      examType={test.settings.examType ?? "CUSTOM"}
                      defaultAllowBackToQuestions={test.settings.allowBackToQuestions ?? true}
                      defaultAllowBackToPart={test.settings.allowBackToPart ?? true}
                      focused
                      onActivate={() => activateSection(section)}
                      onSave={async (input) => setTest(await testsApi.updateSection(test.id, section.id, input))}
                      onDelete={() => askDeleteSection(section)}
                    />
                  )}
                </Stack>
              </>
            ) : null}
          </Stack>
          <AddQuestionDialog
            open={adding}
            busy={busy}
            onClose={() => setAdding(false)}
            onPick={addQuestion}
          />
        </AppShell.Main>
      </AppShell>
    </BuilderFrame>
  );
}

function BuilderHeader({
  test,
  publishing,
  onPreview,
  onPublish,
  save,
}: {
  test: ExamTest;
  publishing: boolean;
  onPreview: () => void;
  onPublish: () => void;
  save: ReactNode;
}) {
  return (
    <BuilderBar
      test={test}
      workspace="builder"
      publishing={publishing}
      onPreview={onPreview}
      onPublish={onPublish}
      save={save}
    />
  );
}

function BuilderFrame({ children }: { children: ReactNode }) {
  return <Box mih="100vh" bg="white">{children}</Box>;
}
