import { Button, Group, Image, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { MediaKind } from "@/entities/media/types";
import { MediaPicker } from "@/features/media-library/MediaPicker";
import { mediaKindOf } from "@/features/media-library/mediaApi";
import { AppAudio } from "@/shared/ui/AppAudio";
import { useMedia } from "./MediaContext";

type MediaAttachmentProps = {
  mediaId?: string;
  kind?: "audio" | "image";
  allowImage?: boolean;
  required?: boolean;
  label?: string;
  onChange: (value: { mediaId: string; mediaKind: "audio" | "image" } | null) => void;
};

export function MediaAttachment({ mediaId, kind = "audio", allowImage = true, required = false, label, onChange }: MediaAttachmentProps) {
  const media = useMedia();
  const [picker, setPicker] = useState<MediaKind | null>(null);
  const heading = label ?? (required ? "Аудиозапись задания" : "Медиа");
  const emptyText = required
    ? "Выберите запись"
    : allowImage
      ? "Добавьте аудио или изображение"
      : "Добавьте аудиозапись";

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>{heading}</Text>
      {mediaId ? (
        <Stack gap="sm">
          {kind === "image"
            ? <Image src={media.asset(mediaId)} alt="Материал задания" maw={360} radius="sm" />
            : <AppAudio src={media.asset(mediaId)} aria-label="Аудиозапись задания" />}
          <Group gap="md">
            <Button variant="subtle" size="compact-sm" onClick={() => setPicker(kind === "image" ? "image" : "audio")}>
              Заменить
            </Button>
            {allowImage && kind === "audio" && (
              <Button variant="subtle" size="compact-sm" onClick={() => setPicker("image")}>
                Изображение
              </Button>
            )}
            {allowImage && kind === "image" && (
              <Button variant="subtle" size="compact-sm" onClick={() => setPicker("audio")}>
                Аудио
              </Button>
            )}
            <Button variant="subtle" color="red" size="compact-sm" onClick={() => onChange(null)}>
              Убрать
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button variant="default" fullWidth onClick={() => setPicker("audio")}>
          {emptyText}
        </Button>
      )}
      <MediaPicker
        open={picker !== null}
        kind={picker ?? "audio"}
        kinds={allowImage ? ["audio", "image"] : undefined}
        onKindChange={setPicker}
        onClose={() => setPicker(null)}
        onPick={(asset) => {
          const picked = mediaKindOf(asset.mimeType);
          onChange({ mediaId: asset.id, mediaKind: picked === "image" ? "image" : "audio" });
          setPicker(null);
        }}
      />
    </Stack>
  );
}
