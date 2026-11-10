import { Box, Group, Image, Stack, Text } from "@mantine/core";
import type { Question } from "@/entities/question/types";
import { AppAudio } from "@/shared/ui/AppAudio";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { CONTENT_LABELS, promptItemId, questionItems } from "./content/contentItems";
import { instructionHasContent, toInstructionDoc } from "./content/instructionDoc";
import { useMedia } from "./media/MediaContext";
import { PromptView } from "./prompt/PromptView";
import { ENGINES } from "./engines";
import { engineOf } from "./registry";

type QuestionPreviewProps = {
  question: Question;
  startNumber?: number;
};

export function QuestionPreview({ question, startNumber = 1 }: QuestionPreviewProps) {
  const media = useMedia();
  const items = questionItems(question);
  const instructions = toInstructionDoc(question.settings.instructions);
  const engine = engineOf(question.type);
  const ui = ENGINES[engine];
  const promptId = promptItemId(items);
  const promptLabel = question.type === "SENTENCE_GAPS"
    ? "Предложения"
    : question.type === "SENTENCE_ERRORS"
      ? "Предложение"
      : question.type === "TEXT_ERRORS"
        ? "Текст с ошибками"
        : engine === "INLINE"
          ? "Пропуски в общем тексте"
          : null;

  return (
    <Stack gap="sm" component="article">
      <Stack gap="md" component="section" aria-label="Вопрос">
        <Text size="lg" fw={600}>Вопрос</Text>
        {instructionHasContent(instructions) ? (
          <Stack gap="xs">
            <Text size="sm" fw={600}>Инструкция</Text>
            <Box style={{ fontSize: "var(--mantine-font-size-sm)" }}>
              <PromptView doc={instructions} />
            </Box>
          </Stack>
        ) : null}
        {items.map((item) => (
          <Stack key={item.id} gap="xs">
            <Text size="sm" fw={600}>
              {item.id === promptId && promptLabel ? promptLabel : CONTENT_LABELS[item.kind]}
            </Text>
            {item.kind === "text" ? (
              <Box
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: "var(--mantine-radius-md)",
                  background: "var(--mantine-color-body)",
                  fontSize: "var(--mantine-font-size-md)",
                  lineHeight: "var(--mantine-line-height-md)",
                }}
              >
                <PromptView doc={item.doc ?? { type: "doc", content: [] }} startNumber={startNumber} />
              </Box>
            ) : item.mediaId ? (
              <Group gap="md" wrap="nowrap" align="center">
                {item.kind === "image" && (
                  <Image src={media.asset(item.mediaId)} alt="" w={64} h={64} fit="cover" radius="md" />
                )}
                {item.kind === "audio" && (
                  <AppAudio src={media.asset(item.mediaId)} maw={360} style={{ flex: 1, minWidth: 0 }} aria-label="Аудиозапись" />
                )}
                {item.kind === "video" && (
                  <Box
                    component="video"
                    src={media.asset(item.mediaId)}
                    controls
                    preload="metadata"
                    w={160}
                    h={64}
                    style={{ display: "block", objectFit: "cover", borderRadius: "var(--mantine-radius-md)", background: "var(--mantine-color-dark-9)" }}
                  />
                )}
              </Group>
            ) : (
              <SettingsHint>Медиа не выбрано</SettingsHint>
            )}
          </Stack>
        ))}
      </Stack>
      {ui.Content || ui.Answers ? (
        <SettingsHint>Нажмите карточку, чтобы настроить ответ</SettingsHint>
      ) : null}
    </Stack>
  );
}
