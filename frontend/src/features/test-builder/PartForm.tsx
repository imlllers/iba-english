import { ActionIcon, Alert, Badge, Card, Group, Stack, TextInput, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { ContentItem, Doc } from "@/entities/question/types";
import type { ExamDisplayType, SectionPart } from "@/entities/test/types";
import { ContentFeedEditor } from "@/features/question-types/content/ContentFeedEditor";
import { scopeItems } from "@/features/question-types/content/contentItems";
import { serializeInstructionDoc, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { InstructionsField } from "@/features/question-types/widgets/InstructionsField";
import type { PartInput } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { Icon } from "@/shared/ui/Icon";
import { Select } from "@/shared/ui/Select";
import { MaterialLivePreview } from "./MaterialLivePreview";

type PartFormProps = {
  part: SectionPart;
  alone: boolean;
  examType?: ExamDisplayType;
  defaultOneQuestionPerPage?: boolean;
  focused?: boolean;
  onActivate?: () => void;
  onSave: (input: PartInput) => Promise<void>;
  onDelete: () => void;
};

export function PartForm({
  part,
  alone,
  defaultOneQuestionPerPage = true,
  focused = false,
  onActivate,
  onSave,
  onDelete,
}: PartFormProps) {
  const [title, setTitle] = useState(part.title);
  const [instructions, setInstructions] = useState<Doc>(() => toInstructionDoc(part.instructions));
  const [items, setItems] = useState<ContentItem[]>(() => scopeItems(part));
  const [oneQuestionPerPage, setOneQuestionPerPage] = useState<boolean | null>(() => part.oneQuestionPerPage ?? null);
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    setTitle(part.title);
    setInstructions(toInstructionDoc(part.instructions));
    setItems(scopeItems(part));
    setOneQuestionPerPage(part.oneQuestionPerPage ?? null);
  }, [part.id, part.oneQuestionPerPage]);

  const persist = (patch: Partial<{
    title: string;
    instructions: Doc;
    items: ContentItem[];
    oneQuestionPerPage: boolean | null;
  }>) => {
    const nextTitle = patch.title ?? title;
    const nextInstructions = patch.instructions ?? instructions;
    const nextItems = patch.items ?? items;
    const nextOne = patch.oneQuestionPerPage !== undefined ? patch.oneQuestionPerPage : oneQuestionPerPage;
    const next: PartInput = {
      title: nextTitle,
      instructions: serializeInstructionDoc(nextInstructions),
      timeLimitMinutes: part.timeLimitMinutes ?? null,
      oneQuestionPerPage: nextOne,
      items: nextItems,
    };
    window.clearTimeout(timer.current);
    if (!next.title.trim()) {
      setError("Укажите название части");
      return;
    }
    timer.current = window.setTimeout(() => {
      onSave(next).then(() => setError(""), (failure: unknown) => setError(errorMessage(failure, "Не удалось сохранить часть")));
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
              Настройки части
            </Badge>
            <Tooltip label={alone ? "Убрать части" : "Удалить часть"}>
              <ActionIcon color="red" aria-label={alone ? "Убрать части" : "Удалить часть"} data-card-action onClick={onDelete}>
                <Icon name="trash" />
              </ActionIcon>
            </Tooltip>
          </Group>
          {error ? <Alert color="red" variant="light">{error}</Alert> : null}
          <TextInput
            label="Название части"
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
            label="Инструкция к части"
            value={instructions}
            onChange={(doc) => {
              setInstructions(doc);
              persist({ instructions: doc });
            }}
          />
          <ContentFeedEditor
            title="Контент к части"
            items={items}
            onChange={(next) => {
              setItems(next);
              persist({ items: next });
            }}
          />
          <Select
            label="Вопросы на странице"
            value={oneQuestionPerPage === null ? "inherit" : oneQuestionPerPage ? "one" : "all"}
            options={[
              { value: "inherit", label: `Как в тесте (${defaultOneQuestionPerPage ? "по одному" : "все сразу"})` },
              { value: "one", label: "По одному" },
              { value: "all", label: "Все сразу" },
            ]}
            onChange={(value) => {
              const next = value === "one" ? true : value === "all" ? false : null;
              setOneQuestionPerPage(next);
              persist({ oneQuestionPerPage: next });
            }}
          />

        </Stack>
      </Card>
      <MaterialLivePreview
        ariaLabel="Превью части для участника"
        title={title}
        instructions={instructions}
        items={items.filter((item) => item.kind !== "audio")}
      />
    </Stack>
  );
}
