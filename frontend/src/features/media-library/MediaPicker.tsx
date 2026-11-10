import { Alert, Anchor, Box, Button, Group, Image, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { MediaAsset, MediaKind } from "@/entities/media/types";
import { errorMessage } from "@/shared/api/client";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { Icon } from "@/shared/ui/Icon";
import { Pagination } from "@/shared/ui/Pagination";
import { mediaApi, teacherMediaUrl } from "./mediaApi";

const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/gif,image/webp",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a",
  video: "video/mp4,video/webm",
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
  const [page, setPage] = useState(0);
  const query = { folderId, q, kind, page, size: 8 };
  const list = useQuery({ queryKey: ["media", query], queryFn: () => mediaApi.list(query), enabled: open });
  const upload = useMutation({
    mutationFn: (file: File) => mediaApi.uploadForTest(file),
    onSuccess: (asset) => onPick(asset),
  });
  const tabs = kinds && kinds.length > 1 ? kinds : null;
  const data = list.data;
  const searching = Boolean(data?.searching);

  const openFolder = (id: string | null) => {
    setFolderId(id);
    setPage(0);
    setQ("");
  };

  return (
    <Modal opened={open} onClose={onClose} title={tabs ? "Выбрать материал" : TITLES[kind]} size="xl" padding="lg">
      <Stack gap="md">
        {tabs && onKindChange ? (
          <Group gap="md" role="tablist" aria-label="Тип материала">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={tab === kind ? "filled" : "default"}
                role="tab"
                aria-selected={tab === kind}
                onClick={() => { onKindChange(tab); setPage(0); }}
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

        <Group gap="md" wrap="wrap" align="flex-end">
          <TextInput
            style={{ flex: 1, minWidth: 200 }}
            aria-label="Поиск по названию"
            placeholder="Поиск по всем папкам"
            value={q}
            onChange={(event) => { setQ(event.currentTarget.value); setPage(0); }}
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
        {list.isLoading && <Text c="dimmed" size="sm">Загрузка…</Text>}
        {data && data.folders.length === 0 && data.items.length === 0 && (
          <Text c="dimmed" size="sm">
            {searching ? "Ничего не найдено." : "В этой папке пока пусто. Загрузите файл или откройте другую папку."}
          </Text>
        )}

        <Stack gap={0} component="ul" style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--mantine-color-gray-3)" }}>
          {data?.folders.map((folder) => (
            <Group
              key={folder.id}
              component="li"
              justify="space-between"
              wrap="nowrap"
              gap="md"
              py="sm"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Box w={56} h={40} bg="gray.1" style={{ display: "grid", placeItems: "center", borderRadius: "var(--mantine-radius-sm)" }} c="dimmed">
                  <Icon name="folder" />
                </Box>
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>{folder.name}</Text>
                  <Text size="xs" c="dimmed">Папка</Text>
                </Stack>
              </Group>
              <Button variant="default" onClick={() => openFolder(folder.id)}>Открыть</Button>
            </Group>
          ))}
          {data?.items.map((asset) => (
            <Group
              key={asset.id}
              component="li"
              justify="space-between"
              wrap="nowrap"
              gap="md"
              py="sm"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Box w={56} h={40} bg="gray.1" style={{ display: "grid", placeItems: "center", borderRadius: "var(--mantine-radius-sm)", overflow: "hidden" }} c="dimmed">
                  {kind === "image" ? (
                    <Image src={teacherMediaUrl(asset.id)} alt="" h={40} w={56} fit="cover" />
                  ) : (
                    <Icon name={kind === "audio" || kind === "video" ? "play" : "file"} />
                  )}
                </Box>
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>{asset.filename}</Text>
                  <Text size="xs" c="dimmed">{formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}</Text>
                </Stack>
              </Group>
              <Button variant="default" onClick={() => onPick(asset)}>Выбрать</Button>
            </Group>
          ))}
        </Stack>
        {data && <Pagination page={page} size={8} total={data.total} onChange={setPage} />}
      </Stack>
    </Modal>
  );
}
