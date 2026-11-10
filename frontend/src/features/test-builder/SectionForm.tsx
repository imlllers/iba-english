import { ActionIcon, Alert, Badge, Card, Group, Stack, TextInput, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { ContentItem, Doc } from "@/entities/question/types";
import type { ExamDisplayType, Section } from "@/entities/test/types";
import { ContentFeedEditor } from "@/features/question-types/content/ContentFeedEditor";
import { scopeItems } from "@/features/question-types/content/contentItems";
import { serializeInstructionDoc, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { InstructionsField } from "@/features/question-types/widgets/InstructionsField";
import type { SectionInput } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { Icon } from "@/shared/ui/Icon";
import { Switch } from "@/shared/ui/Switch";
import { MaterialLivePreview } from "./MaterialLivePreview";

type SectionFormProps = {
  section: Section;
  total: number;
  examType?: ExamDisplayType;
  defaultAllowBackToQuestions?: boolean;
  defaultAllowBackToPart?: boolean;
  focused?: boolean;
  onActivate?: () => void;
  onSave: (input: SectionInput) => Promise<void>;
  onDelete: () => void;
};

function resolved(override: boolean | null | undefined, fallback: boolean) {
  return override ?? fallback;
}

export function SectionForm({
  section,
  total,
  defaultAllowBackToQuestions = true,
  defaultAllowBackToPart = true,
  focused = false,
  onActivate,
  onSave,
  onDelete,
}: SectionFormProps) {
  const [title, setTitle] = useState(section.title);
  const [instructions, setInstructions] = useState<Doc>(() => toInstructionDoc(section.instructions));
  const [items, setItems] = useState<ContentItem[]>(() => scopeItems(section));
  const [allowBackToQuestions, setAllowBackToQuestions] = useState(() =>
    resolved(section.allowBackToQuestions, defaultAllowBackToQuestions),
  );
  const [allowBackToPart, setAllowBackToPart] = useState(() =>
    resolved(section.allowBackToPart, defaultAllowBackToPart),
  );
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    setTitle(section.title);
    setInstructions(toInstructionDoc(section.instructions));
    setItems(scopeItems(section));
    setAllowBackToQuestions(resolved(section.allowBackToQuestions, defaultAllowBackToQuestions));
    setAllowBackToPart(resolved(section.allowBackToPart, defaultAllowBackToPart));
  }, [
    section.id,
    section.allowBackToQuestions,
    section.allowBackToPart,
    defaultAllowBackToQuestions,
    defaultAllowBackToPart,
  ]);

  const persist = (patch: Partial<{
    title: string;
    instructions: Doc;
    items: ContentItem[];
    allowBackToQuestions: boolean;
    allowBackToPart: boolean;
  }>) => {
    const nextTitle = patch.title ?? title;
    const nextInstructions = patch.instructions ?? instructions;
    const nextItems = patch.items ?? items;
    const nextAllowQ = patch.allowBackToQuestions ?? allowBackToQuestions;
    const nextAllowP = patch.allowBackToPart ?? allowBackToPart;
    const next: SectionInput = {
      title: nextTitle,
      instructions: serializeInstructionDoc(nextInstructions),
      sectionType: section.sectionType,
      timeLimitMinutes: section.timeLimitMinutes,
      allowBackToQuestions: nextAllowQ,
      allowBackToPart: nextAllowP,
      items: nextItems,
    };
    window.clearTimeout(timer.current);
    if (!next.title.trim()) {
      setError("Укажите название секции");
      return;
    }
    timer.current = window.setTimeout(() => {
      onSave(next).then(() => setError(""), (failure: unknown) => setError(errorMessage(failure, "Не удалось сохранить секцию")));
    }, 600);
  };

  return (
    <Stack gap="sm">
      <Card
        radius="md"
        bg="white"
        onPointerDownCapture={(event) => {
          if (!(event.target as HTMLElement).closest("[data-card-action]")) onActivate?.();
        }}
        onFocusCapture={(event) => {
          if (!(event.target as HTMLElement).closest("[data-card-action]")) onActivate?.();
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" gap="md" wrap="nowrap">
            <Badge variant={focused ? "filled" : "light"} color="iba" size="md">
              Настройки секции
            </Badge>
            <Tooltip label={total === 1 ? "В тесте должна остаться хотя бы одна секция" : "Удалить секцию"}>
              <ActionIcon
                color="red"
                aria-label="Удалить секцию"
                disabled={total === 1}
                data-card-action
                onClick={onDelete}
              >
                <Icon name="trash" />
              </ActionIcon>
            </Tooltip>
          </Group>
          {error ? <Alert color="red" variant="light">{error}</Alert> : null}
          <TextInput
            label="Название секции"
            withAsterisk
            value={title}
            maxLength={200}
            placeholder="Введите название"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setTitle(value);
              persist({ title: value });
            }}
          />
          <InstructionsField
            label="Инструкция к секции"
            value={instructions}
            onChange={(doc) => {
              setInstructions(doc);
              persist({ instructions: doc });
            }}
          />
          <ContentFeedEditor
            title="Контент к секции"
            items={items}
            onChange={(next) => {
              setItems(next);
              persist({ items: next });
            }}
          />
              <Switch
                label="Можно возвращаться к заданиям в секции"
                labelSize="sm"
                checked={allowBackToQuestions}
                onChange={(checked) => {
                  setAllowBackToQuestions(checked);
                  persist({ allowBackToQuestions: checked });
                }}
              />
              <Switch
                label="Можно возвращаться к частям в секции"
                labelSize="sm"
                checked={allowBackToPart}
                onChange={(checked) => {
                  setAllowBackToPart(checked);
                  persist({ allowBackToPart: checked });
                }}
              />

        </Stack>
      </Card>
      <MaterialLivePreview
        ariaLabel="Превью секции для участника"
        title={title}
        instructions={instructions}
        items={items.filter((item) => item.kind !== "audio")}
      />
    </Stack>
  );
}
