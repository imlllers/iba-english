import { ActionIcon, Badge, Box, Button, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { useEffect, useState, type CSSProperties, type DragEvent } from "react";
import type { Question } from "@/entities/question/types";
import type { ExamTest, MaterialBlock, Section } from "@/entities/test/types";
import { formatQuestionRange, numberQuestionsByScope, totalSlots } from "@/features/question-types/numbering";
import { typeLabel } from "@/features/question-types/registry";
import { formatAnswerKey } from "@/features/test-settings/formatAnswerKey";
import { Icon } from "@/shared/ui/Icon";
import { SidebarLogo } from "@/shared/ui/SidebarLogo";
import { sidebarNavLinkProps } from "@/shared/ui/sidebarNav";
import type { BuilderWorkspace } from "./BuilderBar";
import { outlineOfScope, questionsOfBlock, questionsOfPart, sectionParts } from "./sectionParts";
import { WorkspaceSwitch } from "./WorkspaceSwitch";

function dropWrapStyle(opts: { dragging?: boolean; edge?: "before" | "after" | null; target?: boolean }): CSSProperties {
  const style: CSSProperties = {};
  if (opts.dragging) style.opacity = 0.45;
  if (opts.target) {
    style.outline = "1px dashed color-mix(in srgb, var(--color-white) 60%, transparent)";
    style.outlineOffset = -2;
    style.background = "color-mix(in srgb, var(--color-white) 12%, transparent)";
    style.borderRadius = "var(--mantine-radius-sm)";
  }
  if (opts.edge === "before") style.boxShadow = "inset 0 2px 0 0 var(--color-white)";
  if (opts.edge === "after") style.boxShadow = "inset 0 -2px 0 0 var(--color-white)";
  return style;
}

type NumberEntry = { start: number; count: number; end?: number };

export type PlaceQuestionInput = {
  sectionId: string;
  questionId: string;
  materialBlockId: string | null;
  beforeId?: string | null;
  afterId?: string | null;
  partId?: string | null;
};

type SectionsPanelProps = {
  test: ExamTest;
  workspace?: BuilderWorkspace;
  sectionId: string | undefined;
  partId: string | undefined;
  blockId: string | undefined;
  questionId: string | undefined;
  onSelectSection: (sectionId: string) => void;
  onSelectPart: (sectionId: string, partId: string) => void;
  onSelectBlock: (sectionId: string, partId: string | null, blockId: string) => void;
  onSelectQuestion: (section: Section, question: Question) => void;
  onPlaceQuestion: (input: PlaceQuestionInput) => void;
  onAddQuestion: () => void;
  onAddPart: () => void;
  onAddBlock: () => void;
  onAddSection: () => void;
  canAddQuestion: boolean;
  canAddPart: boolean;
  canAddBlock: boolean;
};

const DRAG_MIME = "application/x-iba-question";

type DragPayload = { sectionId: string; questionId: string };

function readDrag(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData("text/plain");
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as DragPayload;
    if (!parsed?.sectionId || !parsed?.questionId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function slotLabel(start: number, count: number) {
  return formatQuestionRange(start, count, "1");
}

function QuestionRow({
  section,
  question,
  questionId,
  numbers,
  draggingId,
  dropEdge,
  onSelectQuestion,
  onDragStart,
  onDragEnd,
  onDragOverQuestion,
  onDropOnQuestion,
}: {
  section: Section;
  question: Question;
  questionId: string | undefined;
  numbers: Map<string, NumberEntry>;
  draggingId: string | null;
  dropEdge: { questionId: string; edge: "before" | "after" } | null;
  onSelectQuestion: (section: Section, question: Question) => void;
  onDragStart: (section: Section, question: Question, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOverQuestion: (section: Section, question: Question, event: DragEvent) => void;
  onDropOnQuestion: (section: Section, question: Question, event: DragEvent) => void;
}) {
  const entry = numbers.get(question.id);
  if (!entry) {
    return null;
  }
  const current = questionId === question.id;
  const edge = dropEdge?.questionId === question.id ? dropEdge.edge : null;
  const incomplete = formatAnswerKey(question, entry.start).incomplete;
  const title = `${slotLabel(entry.start, entry.count)} · ${typeLabel(question.type)}`;
  return (
    <div
      data-nav-question={question.id}
      style={dropWrapStyle({ dragging: draggingId === question.id, edge })}
      draggable
      onDragStart={(event) => onDragStart(section, question, event)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOverQuestion(section, question, event)}
      onDrop={(event) => onDropOnQuestion(section, question, event)}
    >
      <NavLink
        {...sidebarNavLinkProps}
        active={current}
        label={title}
        aria-label={`${formatQuestionRange(entry.start, entry.count)}, ${typeLabel(question.type)}${incomplete ? ", не заполнены обязательные поля" : ""}`}
        rightSection={
          incomplete ? (
            <Box c="yellow.3" title="Не заполнены обязательные поля" aria-hidden style={{ display: "flex" }}>
              <Icon name="warning" size={14} />
            </Box>
          ) : undefined
        }
        onClick={() => onSelectQuestion(section, question)}
      />
    </div>
  );
}

function BlockNode({
  section,
  block,
  partId,
  active,
  questionId,
  numbers,
  draggingId,
  dropBlockId,
  dropEdge,
  onSelectBlock,
  onSelectQuestion,
  onDragStart,
  onDragEnd,
  onDragOverQuestion,
  onDropOnQuestion,
  onDragOverBlock,
  onDropOnBlock,
}: {
  section: Section;
  block: MaterialBlock;
  partId: string | null;
  active: boolean;
  questionId: string | undefined;
  numbers: Map<string, NumberEntry>;
  draggingId: string | null;
  dropBlockId: string | null;
  dropEdge: { questionId: string; edge: "before" | "after" } | null;
  onSelectBlock: (sectionId: string, partId: string | null, blockId: string) => void;
  onSelectQuestion: (section: Section, question: Question) => void;
  onDragStart: (section: Section, question: Question, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOverQuestion: (section: Section, question: Question, event: DragEvent) => void;
  onDropOnQuestion: (section: Section, question: Question, event: DragEvent) => void;
  onDragOverBlock: (section: Section, block: MaterialBlock, event: DragEvent) => void;
  onDropOnBlock: (section: Section, block: MaterialBlock, event: DragEvent) => void;
}) {
  const items = questionsOfBlock(section, block.id);
  const dropTarget = dropBlockId === block.id;
  const hasCurrent = items.some((item) => item.id === questionId);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (hasCurrent || dropTarget) {
      setOpen(true);
    }
  }, [hasCurrent, dropTarget]);

  return (
    <div
      style={dropWrapStyle({ target: dropTarget })}
      onDragOver={(event) => onDragOverBlock(section, block, event)}
      onDrop={(event) => onDropOnBlock(section, block, event)}
    >
      <NavLink
        {...sidebarNavLinkProps}
        active={active && !questionId}
        label="Группа вопросов"
        leftSection={<Icon name="file" size={14} />}
        rightSection={
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            c="white"
            aria-label={open ? "Свернуть группу" : "Развернуть группу"}
            aria-expanded={open}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          >
            <Icon name={open ? "down" : "chevron"} size={14} />
          </ActionIcon>
        }
        styles={{ ...sidebarNavLinkProps.styles, label: { fontWeight: 600 } }}
        onClick={() => onSelectBlock(section.id, partId, block.id)}
      />
      {open ? (
        <Stack gap={0} pl="md">
          {items.length === 0 ? (
            <Text size="xs" c="dimmed" px="md" py={6}>
              Перетащите задание сюда
            </Text>
          ) : (
            items.map((question) => (
              <QuestionRow
                key={question.id}
                section={section}
                question={question}
                questionId={questionId}
                numbers={numbers}
                draggingId={draggingId}
                dropEdge={dropEdge}
                onSelectQuestion={onSelectQuestion}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOverQuestion={onDragOverQuestion}
                onDropOnQuestion={onDropOnQuestion}
              />
            ))
          )}
        </Stack>
      ) : null}
    </div>
  );
}

function OutlineList(props: {
  section: Section;
  partId: string | null;
  current: boolean;
  blockId: string | undefined;
  questionId: string | undefined;
  numbers: Map<string, NumberEntry>;
  draggingId: string | null;
  dropBlockId: string | null;
  dropEdge: { questionId: string; edge: "before" | "after" } | null;
  onSelectBlock: (sectionId: string, partId: string | null, blockId: string) => void;
  onSelectQuestion: (section: Section, question: Question) => void;
  onDragStart: (section: Section, question: Question, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOverQuestion: (section: Section, question: Question, event: DragEvent) => void;
  onDropOnQuestion: (section: Section, question: Question, event: DragEvent) => void;
  onDragOverBlock: (section: Section, block: MaterialBlock, event: DragEvent) => void;
  onDropOnBlock: (section: Section, block: MaterialBlock, event: DragEvent) => void;
}) {
  const { section, partId, current, blockId, questionId, numbers, ...rest } = props;
  return (
    <>
      {outlineOfScope(section, partId).map((item) =>
        item.kind === "block" ? (
          <BlockNode
            key={item.block.id}
            section={section}
            block={item.block}
            partId={partId}
            active={current && blockId === item.block.id}
            questionId={current ? questionId : undefined}
            numbers={numbers}
            {...rest}
          />
        ) : (
          <QuestionRow
            key={item.question.id}
            section={section}
            question={item.question}
            questionId={current ? questionId : undefined}
            numbers={numbers}
            draggingId={rest.draggingId}
            dropEdge={rest.dropEdge}
            onSelectQuestion={rest.onSelectQuestion}
            onDragStart={rest.onDragStart}
            onDragEnd={rest.onDragEnd}
            onDragOverQuestion={rest.onDragOverQuestion}
            onDropOnQuestion={rest.onDropOnQuestion}
          />
        ),
      )}
    </>
  );
}

export function SectionsPanel({
  test,
  workspace = "builder",
  sectionId,
  partId,
  blockId,
  questionId,
  onSelectSection,
  onSelectPart,
  onSelectBlock,
  onSelectQuestion,
  onPlaceQuestion,
  onAddQuestion,
  onAddPart,
  onAddBlock,
  onAddSection,
  canAddQuestion,
  canAddPart,
  canAddBlock,
}: SectionsPanelProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const draggingId = dragging?.questionId ?? null;
  const [dropBlockId, setDropBlockId] = useState<string | null>(null);
  const [dropPartId, setDropPartId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<{ questionId: string; edge: "before" | "after" } | null>(null);

  const examType = test.settings.examType ?? "CUSTOM";
  const numbers = numberQuestionsByScope(test.sections, test.settings.questionNumberScope ?? "test", examType);

  useEffect(() => {
    if (!questionId) {
      return;
    }
    document.querySelector(`[data-nav-question="${questionId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [questionId]);

  const clearDrop = () => {
    setDropBlockId(null);
    setDropPartId(null);
    setDropEdge(null);
  };

  const onDragStart = (section: Section, question: Question, event: DragEvent) => {
    const payload: DragPayload = { sectionId: section.id, questionId: question.id };
    const raw = JSON.stringify(payload);
    event.dataTransfer.setData(DRAG_MIME, raw);
    event.dataTransfer.setData("text/plain", raw);
    event.dataTransfer.effectAllowed = "move";
    setDragging(payload);
  };

  const onDragEnd = () => {
    setDragging(null);
    clearDrop();
  };

  const onDragOverQuestion = (section: Section, question: Question, event: DragEvent) => {
    if (!dragging || dragging.sectionId !== section.id || dragging.questionId === question.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const edge = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropBlockId(null);
    setDropPartId(null);
    setDropEdge({ questionId: question.id, edge });
  };

  const onDropOnQuestion = (section: Section, target: Question, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDrag(event) ?? dragging;
    clearDrop();
    setDragging(null);
    if (!payload || payload.sectionId !== section.id || payload.questionId === target.id) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    onPlaceQuestion({
      sectionId: section.id,
      questionId: payload.questionId,
      materialBlockId: target.materialBlockId ?? null,
      beforeId: before ? target.id : null,
      afterId: before ? null : target.id,
    });
  };

  const onDragOverBlock = (section: Section, block: MaterialBlock, event: DragEvent) => {
    if (!dragging || dragging.sectionId !== section.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropEdge(null);
    setDropPartId(null);
    setDropBlockId(block.id);
  };

  const onDropOnBlock = (section: Section, block: MaterialBlock, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDrag(event) ?? dragging;
    clearDrop();
    setDragging(null);
    if (!payload || payload.sectionId !== section.id) {
      return;
    }
    const source = section.questions.find((item) => item.id === payload.questionId);
    if (!source || source.materialBlockId === block.id) {
      return;
    }
    onPlaceQuestion({
      sectionId: section.id,
      questionId: payload.questionId,
      materialBlockId: block.id,
      partId: block.partId ?? null,
    });
  };

  const onDragOverPart = (section: Section, nextPartId: string, event: DragEvent) => {
    if (!dragging || dragging.sectionId !== section.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropEdge(null);
    setDropBlockId(null);
    setDropPartId(nextPartId);
  };

  const onDropOnPart = (section: Section, nextPartId: string, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDrag(event) ?? dragging;
    clearDrop();
    setDragging(null);
    if (!payload || payload.sectionId !== section.id) {
      return;
    }
    onPlaceQuestion({
      sectionId: section.id,
      questionId: payload.questionId,
      materialBlockId: null,
      partId: nextPartId,
    });
  };

  const outlineProps = {
    draggingId,
    dropBlockId,
    dropEdge,
    onSelectBlock,
    onSelectQuestion,
    onDragStart,
    onDragEnd,
    onDragOverQuestion,
    onDropOnQuestion,
    onDragOverBlock,
    onDropOnBlock,
  };

  return (
    <Stack h="100%" gap={0} aria-label="Секции" className="iba-sidebar" style={{ minHeight: 0 }}>
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
        <WorkspaceSwitch testId={test.id} workspace={workspace} />
      </Box>
      <ScrollArea flex={1} px="md" pb="sm" type="never" scrollbarSize={0}>
        <Stack gap="xs">
          {test.sections.map((section) => {
            const current = section.id === sectionId;
            const parts = sectionParts(section);
            const activeSection = current && !partId && !blockId && !questionId;
            return (
              <div key={section.id}>
                <NavLink
                  {...sidebarNavLinkProps}
                  active={activeSection}
                  label={section.title}
                  description={`${section.timeLimitMinutes ? `${section.timeLimitMinutes} мин · ` : ""}${totalSlots(section.questions, examType)} вопр.`}
                  leftSection={<Icon name="folder" size={16} />}
                  styles={{ ...sidebarNavLinkProps.styles, label: { fontWeight: 600 } }}
                  onClick={() => onSelectSection(section.id)}
                />
                <Stack gap={0} pl="sm">
                  {parts.length === 0 && (
                    <OutlineList
                      section={section}
                      partId={null}
                      current={current}
                      blockId={blockId}
                      questionId={questionId}
                      numbers={numbers}
                      {...outlineProps}
                    />
                  )}
                  {parts.map((part) => {
                    const activePart = current && partId === part.id && !blockId && !questionId;
                    const partDropTarget = dropPartId === part.id;
                    return (
                      <div key={part.id}>
                        <div
                          style={dropWrapStyle({ target: partDropTarget })}
                          onDragOver={(event) => onDragOverPart(section, part.id, event)}
                          onDrop={(event) => onDropOnPart(section, part.id, event)}
                        >
                          <NavLink
                            {...sidebarNavLinkProps}
                            active={activePart}
                            label={part.title}
                            rightSection={
                              <Badge size="xs" variant="outline" color="gray">
                                {totalSlots(questionsOfPart(section, part.id), examType)}
                              </Badge>
                            }
                            styles={{ ...sidebarNavLinkProps.styles, label: { fontWeight: 600 } }}
                            onClick={() => onSelectPart(section.id, part.id)}
                          />
                        </div>
                        <Stack gap={0} pl="sm">
                          <OutlineList
                            section={section}
                            partId={part.id}
                            current={current}
                            blockId={blockId}
                            questionId={questionId}
                            numbers={numbers}
                            {...outlineProps}
                          />
                        </Stack>
                      </div>
                    );
                  })}
                </Stack>
              </div>
            );
          })}
        </Stack>
      </ScrollArea>
      <Stack
        gap={2}
        px="md"
        py="sm"
      >
        <Button fullWidth variant="subtle" color="gray" c="white" size="compact-sm" justify="flex-start" leftSection={<Icon name="plus" />} disabled={!canAddQuestion} onClick={onAddQuestion}>
          Задание
        </Button>
        <Button fullWidth variant="subtle" color="gray" c="white" size="compact-sm" justify="flex-start" leftSection={<Icon name="plus" />} disabled={!canAddBlock} onClick={onAddBlock}>
          Группа вопросов
        </Button>
        <Button fullWidth variant="subtle" color="gray" c="white" size="compact-sm" justify="flex-start" leftSection={<Icon name="plus" />} disabled={!canAddPart} onClick={onAddPart}>
          Часть
        </Button>
        <Button fullWidth variant="subtle" color="gray" c="white" size="compact-sm" justify="flex-start" leftSection={<Icon name="plus" />} onClick={onAddSection}>
          Секция
        </Button>
      </Stack>
    </Stack>
  );
}
