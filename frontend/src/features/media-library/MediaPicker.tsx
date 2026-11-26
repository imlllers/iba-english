import { Alert, Anchor, Box, Button, Group, Image, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MediaAsset, MediaKind } from "@/entities/media/types";
import { errorMessage } from "@/shared/api/client";
import { formatBytes } from "@/shared/lib/format";
import { useDebounced } from "@/shared/lib/useDebounced";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { MediaAudioPlayer } from "./MediaAudioPlayer";
import { mediaApi, mediaKindOf, teacherMediaUrl } from "./mediaApi";

const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/gif,image/webp",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a",
  video: "video/mp4,video/quicktime,video/webm",
  application: "application/pdf",
};

const TITLES: Record<MediaKind, string> = {
  image: "Выбрать изображение",
  audio: "Выбрать аудиозапись",
  video: "Выбрать видео",
  application: "Выбрать документ",
};

const KIND_LABEL: Partial<Record<MediaKind, string>> = {
  audio: "Аудио",
  image: "Изображение",
  video: "Видео",
};

const PAGE_SIZE = 100;

type MediaPickerProps = {
  open: boolean;
  kind: MediaKind;
  kinds?: MediaKind[];
  onKindChange?: (kind: MediaKind) => void;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
};

export function MediaPicker({ open, kind, kinds, onKindChange, onClose, onPick }: MediaPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const search = useDebounced(q.trim());
  const query = { folderId, q: search, kind, page: 0, size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["media-picker", query], queryFn: () => mediaApi.list(query), enabled: open });
  const upload = useMutation({
    mutationFn: (file: File) => mediaApi.uploadForTest(file),
    onSuccess: (asset) => onPick(asset),
  });
  const tabs = kinds && kinds.length > 1 ? kinds : null;
  const data = list.data;
  const searching = Boolean(data?.searching);
  const folders = data?.folders ?? [];
  const items = data?.items ?? [];
  const gallery = kind === "image" || kind === "video";
  const empty = Boolean(data && folders.length === 0 && items.length === 0);

  useEffect(() => {
    if (!open) {
      setFolderId(null);
      setQ("");
    }
  }, [open, kind]);

  const openFolder = (id: string | null) => {
    setFolderId(id);
    setQ("");
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={tabs ? "Выбрать материал" : TITLES[kind]}
      size="xl"
      padding="md"
      styles={{
        content: {
          maxHeight: "calc(100dvh - 2 * var(--mantine-spacing-xl))",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        },
      }}
    >
      <Stack gap="sm" className="media-picker-modal__stack">
        {tabs && onKindChange ? (
          <Group gap="md" role="tablist" aria-label="Тип материала">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={tab === kind ? "filled" : "default"}
                role="tab"
                aria-selected={tab === kind}
                onClick={() => onKindChange(tab)}
              >
                {KIND_LABEL[tab] ?? tab}
              </Button>
            ))}
          </Group>
        ) : null}

        <Group gap={4} wrap="wrap" aria-label="Путь">
          <Anchor component="button" type="button" fw={!folderId && !searching ? 700 : 500} onClick={() => openFolder(null)}>
            Материалы
          </Anchor>
          {(data?.path ?? []).map((item, index, all) => (
            <Group key={item.id} gap={4} wrap="nowrap">
              <Text c="dimmed" size="sm">/</Text>
              <Anchor
                component="button"
                type="button"
                fw={index === all.length - 1 && !searching ? 700 : 500}
                onClick={() => openFolder(item.id)}
              >
                {item.name}
              </Anchor>
            </Group>
          ))}
          {searching && (
            <Group gap={4} wrap="nowrap">
              <Text c="dimmed" size="sm">/</Text>
              <Text size="sm" fw={700}>Поиск</Text>
            </Group>
          )}
        </Group>

        <Group gap="md" wrap="nowrap" align="flex-end">
          <TextInput
            style={{ flex: 1, minWidth: 0 }}
            aria-label="Поиск по названию"
            placeholder="Поиск по всем папкам"
            value={q}
            onChange={(event) => setQ(event.currentTarget.value)}
          />
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept={ACCEPT[kind]}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            leftSection={<Icon name="upload" />}
            loading={upload.isPending}
            onClick={() => input.current?.click()}
          >
            Загрузить файл
          </Button>
        </Group>

        {upload.error && <Alert color="red" variant="light">{errorMessage(upload.error, "Не удалось загрузить файл")}</Alert>}

        <ScrollArea flex={1} type="auto" offsetScrollbars className="media-picker-modal__scroll">
          <Stack gap="sm">
            {folders.length > 0 ? (
              <Group gap="sm">
                {folders.map((folder) => (
                  <UnstyledButton
                    key={folder.id}
                    type="button"
                    className="media-picker-folder"
                    onClick={() => openFolder(folder.id)}
                  >
                    <Box c="iba" style={{ flex: "none", display: "flex" }}><Icon name="folder" size={18} /></Box>
                    <Text fw={600} size="sm" truncate>{folder.name}</Text>
                  </UnstyledButton>
                ))}
              </Group>
            ) : null}

            {list.isLoading ? <Loading /> : null}
            {empty ? (
              <SettingsHint>
                {searching ? "Ничего не найдено" : "В этой папке пока пусто. Загрузите файл или откройте другую папку"}
              </SettingsHint>
            ) : null}

            {gallery && items.length > 0 ? (
              <Box className="media-picker-grid">
                {items.map((asset) => {
                  const src = teacherMediaUrl(asset.id);
                  const type = mediaKindOf(asset.mimeType);
                  return (
                    <UnstyledButton
                      key={asset.id}
                      type="button"
                      className="media-picker-tile"
                      aria-label={`Выбрать «${asset.filename}»`}
                      onClick={() => onPick(asset)}
                    >
                      <Box className="media-picker-tile__preview">
                        {type === "video" ? (
                          <Box component="video" src={`${src}#t=0.001`} muted playsInline preload="metadata" />
                        ) : (
                          <Image src={src} alt="" radius={0} w="100%" h="100%" fit="cover" />
                        )}
                      </Box>
                      <Box className="media-picker-tile__meta">
                        <Text fw={600} size="sm" truncate>{asset.filename}</Text>
                      </Box>
                    </UnstyledButton>
                  );
                })}
              </Box>
            ) : null}

            {!gallery && items.length > 0 ? (
              <Stack gap={0} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((asset) => {
                  const src = teacherMediaUrl(asset.id);
                  const type = mediaKindOf(asset.mimeType);
                  return (
                    <Box component="li" key={asset.id} className="media-file-row">
                      <Box w={40} h={40} style={{ flex: "none", display: "grid", placeItems: "center" }}>
                        {type === "audio" ? (
                          <MediaAudioPlayer compact src={src} label={asset.filename} />
                        ) : (
                          <Box c="iba"><Icon name="file" size={20} /></Box>
                        )}
                      </Box>
                      <UnstyledButton
                        type="button"
                        style={{ minWidth: 0, flex: 1, textAlign: "start" }}
                        onClick={() => onPick(asset)}
                      >
                        <Text fw={600} truncate>{asset.filename}</Text>
                        <Text size="sm" c="dimmed">{formatBytes(asset.sizeBytes)}</Text>
                      </UnstyledButton>
                    </Box>
                  );
                })}
              </Stack>
            ) : null}

            {data && data.total > items.length ? (
              <SettingsHint>Показаны первые {items.length} файлов. Уточните поиск, если нужного нет в списке</SettingsHint>
            ) : null}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
