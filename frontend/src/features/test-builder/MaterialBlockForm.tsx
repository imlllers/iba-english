import { ActionIcon, Alert, Badge, Card, Group, Stack, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { Doc, Question } from "@/entities/question/types";
import type { ExamDisplayType, MaterialBlock, QuestionNumberFormat } from "@/entities/test/types";
import { ContentFeedEditor } from "@/features/question-types/content/ContentFeedEditor";
import { blockItems } from "@/features/question-types/content/contentItems";
import { serializeInstructionDoc, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { InstructionsField } from "@/features/question-types/widgets/InstructionsField";
import type { MaterialBlockInput } from "@/features/tests/testsApi";
import { errorMessage } from "@/shared/api/client";
import { Icon } from "@/shared/ui/Icon";
import { MaterialLivePreview } from "./MaterialLivePreview";

type LinkedPreviewQuestion = {
  question: Question;
  startNumber: number;
};

type MaterialBlockFormProps = {
  block: MaterialBlock;
  cardId?: string;
  questionsHeading?: string | null;
  linkedQuestions?: LinkedPreviewQuestion[];
  numberFormat?: QuestionNumberFormat;
  examType?: ExamDisplayType;
  onActivate?: () => void;
  onSave: (input: MaterialBlockInput) => Promise<void>;
  onDelete: () => void;
};

export function MaterialBlockForm({
  block,
  cardId,
  questionsHeading,
  linkedQuestions = [],
  numberFormat = "1",
  examType = "CUSTOM",
  onActivate,
  onSave,
  onDelete,
}: MaterialBlockFormProps) {
  const [items, setItems] = useState(() => blockItems(block));
  const [instructions, setInstructions] = useState<Doc>(() => toInstructionDoc(block.instructions));
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    setItems(blockItems(block));
    setInstructions(toInstructionDoc(block.instructions));
  }, [block.id]);

  const persist = (patch: MaterialBlockInput) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onSave(patch).then(() => setError(""), (failure: unknown) => setError(errorMessage(failure, "Не удалось сохранить")));
    }, 600);
  };

  return (
    <Stack gap="sm">
      <Card
        id={cardId}
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
            <Badge variant="filled" color="iba" size="md">
              Группа вопросов
            </Badge>
            <Tooltip label="Удалить группу вопросов">
              <ActionIcon color="red" aria-label="Удалить группу вопросов" data-card-action onClick={onDelete}>
                <Icon name="trash" />
              </ActionIcon>
            </Tooltip>
          </Group>
          {error ? <Alert color="red" variant="light">{error}</Alert> : null}
          <ContentFeedEditor
            items={items}
            beforeItems={(
              <InstructionsField
                value={instructions}
                onChange={(doc) => {
                  setInstructions(doc);
                  persist({ instructions: serializeInstructionDoc(doc) });
                }}
              />
            )}
            onChange={(next) => {
              setItems(next);
              persist({ items: next });
            }}
          />
        </Stack>
      </Card>
      <MaterialLivePreview
        ariaLabel="Превью группы вопросов для участника"
        title={examType === "TOEFL" ? undefined : questionsHeading || undefined}
        instructions={instructions}
        items={items}
        questions={linkedQuestions}
        numberFormat={numberFormat}
        examType={examType}
      />
    </Stack>
  );
}
