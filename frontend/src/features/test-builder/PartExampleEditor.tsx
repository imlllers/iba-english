import { Button, Group, Image, Paper, Radio, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useState, type ReactNode } from "react";
import type { PartExample, PartExampleBlock } from "@/entities/test/types";
import { MediaPicker } from "@/features/media-library/MediaPicker";
import { AppAudio } from "@/shared/ui/AppAudio";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { IconButton } from "@/shared/ui/IconButton";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";
import { RichTextEditor } from "@/features/question-types/prompt/RichTextEditor";
import {
  createExampleAudioBlock,
  createExampleChoicesBlock,
  createExampleImageBlock,
  createExampleTextBlock,
} from "@/features/question-types/content/partExample";
import { useMedia } from "@/features/question-types/media/MediaContext";
import { letter } from "@/shared/lib/format";
import { newId } from "@/shared/lib/ids";

const BLOCK_LABELS: Record<PartExampleBlock["kind"], string> = {
  text: "Текст",
  image: "Изображение",
  audio: "Аудио",
  choices: "Варианты",
};

type PartExampleEditorProps = {
  example: PartExample;
  onChange: (example: PartExample) => void;
  onRemove: () => void;
};

export function PartExampleEditor({ example, onChange, onRemove }: PartExampleEditorProps) {
  const media = useMedia();
  const [picking, setPicking] = useState<PartExampleBlock | null>(null);
  const [removingBlock, setRemovingBlock] = useState<PartExampleBlock | null>(null);

  const setBlocks = (blocks: PartExampleBlock[]) => onChange({ blocks });

  const replaceBlock = (id: string, patch: Partial<PartExampleBlock>) => {
    setBlocks(example.blocks.map((block) => (block.id === id ? { ...block, ...patch } as PartExampleBlock : block)));
  };

  const move = (index: number, shift: number) => {
    const next = [...example.blocks];
    const [item] = next.splice(index, 1);
    next.splice(index + shift, 0, item);
    setBlocks(next);
  };

  const add = (kind: PartExampleBlock["kind"]) => {
    const block = kind === "text"
      ? createExampleTextBlock()
      : kind === "image"
        ? createExampleImageBlock()
        : kind === "audio"
          ? createExampleAudioBlock()
          : createExampleChoicesBlock();
    setBlocks([...example.blocks, block]);
  };

  return (
    <CardWrapper onRemove={onRemove}>
      <Stack gap="md">
        {example.blocks.map((block, index) => (
          <Stack key={block.id} gap="xs">
            <Group justify="space-between" gap="md" wrap="nowrap">
              <Text size="sm" fw={600}>{BLOCK_LABELS[block.kind]}</Text>
              <Group gap="md" wrap="nowrap">
                <IconButton label="Выше" disabled={index === 0} onClick={() => move(index, -1)}>
                  <Icon name="up" />
                </IconButton>
                <IconButton label="Ниже" disabled={index === example.blocks.length - 1} onClick={() => move(index, 1)}>
                  <Icon name="down" />
                </IconButton>
                <IconButton color="red" label="Удалить" onClick={() => setRemovingBlock(block)}>
                  <Icon name="trash" />
                </IconButton>
              </Group>
            </Group>
            {block.kind === "text" ? (
              <RichTextEditor
                value={block.doc ?? { type: "doc", content: [] }}
                mode="plain"
                label="Текст"
                onChange={(doc) => replaceBlock(block.id, { doc })}
              />
            ) : block.kind === "choices" ? (
              <ChoicesEditor block={block} onChange={(next) => replaceBlock(block.id, next)} />
            ) : block.mediaId ? (
              <Group gap="md" wrap="nowrap" align="center">
                {block.kind === "image" ? (
                  <Image src={media.asset(block.mediaId)} alt="" w={64} h={64} fit="cover" radius="md" />
                ) : (
                  <AppAudio src={media.asset(block.mediaId)} maw={360} style={{ flex: 1, minWidth: 0 }} aria-label="Аудиозапись" />
                )}
                <Button variant="subtle" size="compact-sm" onClick={() => setPicking(block)}>Заменить</Button>
              </Group>
            ) : (
              <UnstyledButton onClick={() => setPicking(block)} style={{ width: "100%", borderRadius: "var(--mantine-radius-md)" }}>
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
                    <SettingsHint>{block.kind === "image" ? "Выберите изображение" : "Выберите аудиозапись"}</SettingsHint>
                  </Group>
                </Paper>
              </UnstyledButton>
            )}
          </Stack>
        ))}
        <Group gap="md" wrap="wrap">
          <Button variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={() => add("text")}>Текст</Button>
          <Button variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={() => add("image")}>Изображение</Button>
          <Button variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={() => add("choices")}>Варианты</Button>
          <Button variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={() => add("audio")}>Аудио</Button>
        </Group>
      </Stack>
      <MediaPicker
        open={picking !== null}
        kind={picking?.kind === "image" ? "image" : "audio"}
        onClose={() => setPicking(null)}
        onPick={(asset) => {
          if (picking) {
            replaceBlock(picking.id, { mediaId: asset.id });
          }
          setPicking(null);
        }}
      />
      <ConfirmDialog
        open={removingBlock !== null}
        title="Удалить блок?"
        confirmLabel="Удалить"
        danger
        onClose={() => setRemovingBlock(null)}
        onConfirm={() => {
          if (removingBlock) {
            setBlocks(example.blocks.filter((entry) => entry.id !== removingBlock.id));
          }
          setRemovingBlock(null);
        }}
      >
        Блок «{removingBlock ? BLOCK_LABELS[removingBlock.kind] : ""}» будет удалён из примера.
      </ConfirmDialog>
    </CardWrapper>
  );
}

function CardWrapper({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <Stack gap="md" component="section" aria-label="Пример">
      <Group justify="space-between" gap="md" wrap="nowrap" align="center">
        <SettingsSectionTitle>Пример</SettingsSectionTitle>
        <Button variant="subtle" color="red" size="compact-sm" onClick={onRemove}>Убрать пример</Button>
      </Group>
      {children}
    </Stack>
  );
}

function ChoicesEditor({
  block,
  onChange,
}: {
  block: Extract<PartExampleBlock, { kind: "choices" }>;
  onChange: (next: PartExampleBlock) => void;
}) {
  const updateOption = (id: string, text: string) => {
    onChange({
      ...block,
      options: block.options.map((option) => (option.id === id ? { ...option, text } : option)),
    });
  };
  const setCorrect = (id: string) => onChange({ ...block, correctId: id });
  const addOption = () => {
    if (block.options.length >= 4) {
      return;
    }
    onChange({ ...block, options: [...block.options, { id: newId(), text: "" }] });
  };
  const removeOption = (id: string) => {
    if (block.options.length <= 2) {
      return;
    }
    const options = block.options.filter((option) => option.id !== id);
    const correctId = block.correctId === id ? options[0]?.id ?? "" : block.correctId;
    onChange({ ...block, options, correctId });
  };
  return (
    <Stack gap="sm">
      {block.options.map((option, index) => (
        <Group key={option.id} gap="md" wrap="nowrap" align="flex-end">
          <Radio checked={block.correctId === option.id} label={`Правильный (${letter(index)})`} onChange={() => setCorrect(option.id)} />
          <TextInput
            style={{ flex: 1 }}
            value={option.text}
            placeholder={`Вариант (${letter(index)})`}
            onChange={(event) => updateOption(option.id, event.currentTarget.value)}
          />
          <IconButton color="red" label="Удалить вариант" disabled={block.options.length <= 2} onClick={() => removeOption(option.id)}>
            <Icon name="trash" />
          </IconButton>
        </Group>
      ))}
      <Button variant="subtle" size="compact-sm" disabled={block.options.length >= 4} onClick={addOption}>
        Добавить вариант
      </Button>
    </Stack>
  );
}