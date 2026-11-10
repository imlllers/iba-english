import { Button, Group, Stack } from "@mantine/core";
import type { Question } from "@/entities/question/types";
import { Icon } from "@/shared/ui/Icon";
import { ENGINES } from "./engines";
import { MediaAttachment } from "./media/MediaAttachment";
import { engineOf } from "./registry";

type QuestionSettingsProps = {
  question: Question;
  update: (patch: Partial<Question>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  part?: "body" | "score";
  startNumber?: number;
};

export function QuestionSettings({ question, update, onDuplicate, onDelete, part = "body", startNumber = 1 }: QuestionSettingsProps) {
  const engine = engineOf(question.type);
  const Answers = ENGINES[engine].Answers;

  return (
    <Stack gap="md">
      {part === "body" && (
        <MediaAttachment
          mediaId={question.settings.mediaId || undefined}
          kind={question.settings.mediaKind ?? "audio"}
          onChange={(value) => {
            const settings = { ...question.settings };
            if (value) {
              settings.mediaId = value.mediaId;
              settings.mediaKind = value.mediaKind;
            } else {
              settings.mediaId = "";
              delete settings.mediaKind;
            }
            update({ settings });
          }}
        />
      )}
      <Answers question={question} update={update} part={part} startNumber={startNumber} />
      {part === "body" && (
        <Group gap="md">
          <Button variant="subtle" size="compact-sm" leftSection={<Icon name="copy" />} onClick={onDuplicate}>
            Дублировать
          </Button>
          <Button variant="subtle" color="red" size="compact-sm" leftSection={<Icon name="trash" />} onClick={onDelete}>
            Удалить
          </Button>
        </Group>
      )}
    </Stack>
  );
}
