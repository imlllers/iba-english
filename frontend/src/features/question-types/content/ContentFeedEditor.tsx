import { Box, Button, Group, Image, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useState, type ReactNode } from "react";
import type { ContentItem, ContentKind } from "@/entities/question/types";
import { MediaPicker } from "@/features/media-library/MediaPicker";
import { AppAudio } from "@/shared/ui/AppAudio";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { IconButton } from "@/shared/ui/IconButton";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { useMedia } from "../media/MediaContext";
import { RichTextEditor, type PromptMode } from "../prompt/RichTextEditor";
import { CONTENT_LABELS, createItem, promptItemId } from "./contentItems";

const KINDS: ContentKind[] = ["text", "audio", "video", "image"];

const EMPTY_MEDIA: Record<Exclude<ContentKind, "text">, string> = {
  audio: "Выберите аудиозапись",
  video: "Выберите видео",
  image: "Выберите изображение",
};

type PromptOptions = { mode: PromptMode; numberBlanks: boolean; startNumber: number; label?: string };

type ContentFeedEditorProps = {
  title?: string;
  titleSize?: "sm" | "md" | "lg";
  items: ContentItem[];
  onChange: (items: ContentItem[]) => void;
  prompt?: PromptOptions;
  promptRequired?: boolean;
  beforeItems?: ReactNode;
};

export function ContentFeedEditor({
  title,
  titleSize = "sm",
  items,
  onChange,
  prompt,
  promptRequired = true,
  beforeItems,
}: ContentFeedEditorProps) {
  const media = useMedia();
  const [picking, setPicking] = useState<ContentItem | null>(null);
  const [removing, setRemoving] = useState<ContentItem | null>(null);
  const promptId = prompt ? promptItemId(items) : undefined;

  const replace = (id: string, patch: Partial<ContentItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const move = (index: number, shift: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + shift, 0, item);
    onChange(next);
  };

  const add = (kind: ContentKind) => {
    onChange([...items, createItem(kind)]);
  };

  return (
    <Stack gap="md" component="section" aria-label={title || "Контент"}>
      {title ? (
        titleSize === "lg" ? <SettingsSectionTitle>{title}</SettingsSectionTitle> : <Text size={titleSize} fw={700}>{title}</Text>
      ) : null}
      {beforeItems}
      {items.map((item, index) => (
        <Stack key={item.id} gap="xs">
          <Group justify="space-between" gap="md" wrap="nowrap">
            <Text size="sm" fw={600}>
              {item.id === promptId && prompt?.label ? prompt.label : CONTENT_LABELS[item.kind]}
              {item.id === promptId && promptRequired ? (
                <span aria-hidden style={{ color: "var(--mantine-color-error)", marginInlineStart: 4 }}>
                  *
                </span>
              ) : null}
            </Text>
            <Group gap="md" wrap="nowrap">
              <IconButton label="Выше" disabled={index === 0} onClick={() => move(index, -1)}>
                <Icon name="up" />
              </IconButton>
              <IconButton label="Ниже" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                <Icon name="down" />
              </IconButton>
              <IconButton color="red" label="Удалить" onClick={() => setRemoving(item)}>
                <Icon name="trash" />
              </IconButton>
            </Group>
          </Group>
          {item.kind === "text" ? (
            <RichTextEditor
              key={item.id}
              value={item.doc ?? { type: "doc", content: [] }}
              mode={item.id === promptId ? prompt?.mode : "plain"}
              numberBlanks={item.id === promptId ? prompt?.numberBlanks : undefined}
              startNumber={item.id === promptId ? prompt?.startNumber : undefined}
              label={CONTENT_LABELS.text}
              onChange={(doc) => replace(item.id, { doc })}
            />
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
              <Button variant="subtle" size="compact-sm" onClick={() => setPicking(item)}>Заменить</Button>
            </Group>
          ) : (
            <UnstyledButton onClick={() => setPicking(item)} style={{ width: "100%", borderRadius: "var(--mantine-radius-md)" }}>
              <Paper
                withBorder
                radius="md"
                px="md"
                py="lg"
                bg="gray.0"
                styles={{
                  root: {
                    borderStyle: "dashed",
                    minHeight: 88,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": { borderColor: "var(--mantine-color-iba-4)", background: "var(--mantine-color-iba-0)" },
                  },
                }}
              >
                <Group justify="center" gap="sm">
                  <Icon name="upload" />
                  <SettingsHint>{EMPTY_MEDIA[item.kind]}</SettingsHint>
                </Group>
              </Paper>
            </UnstyledButton>
          )}
        </Stack>
      ))}
      <Group gap="md" wrap="wrap">
        {KINDS.map((kind) => (
          <Button key={kind} variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={() => add(kind)}>
            {CONTENT_LABELS[kind]}
          </Button>
        ))}
      </Group>
      <MediaPicker
        open={picking !== null}
        kind={picking?.kind === "text" || !picking ? "audio" : picking.kind}
        onClose={() => setPicking(null)}
        onPick={(asset) => {
          if (picking) {
            replace(picking.id, { mediaId: asset.id });
          }
          setPicking(null);
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Удалить блок?"
        confirmLabel="Удалить"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) onChange(items.filter((entry) => entry.id !== removing.id));
          setRemoving(null);
        }}
      >
        Блок «{removing ? CONTENT_LABELS[removing.kind] : ""}» будет удалён из задания.
      </ConfirmDialog>
    </Stack>
  );
}
