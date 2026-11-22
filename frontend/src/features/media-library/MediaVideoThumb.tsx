import { Box, UnstyledButton } from "@mantine/core";

type MediaVideoThumbProps = {
  src: string;
  width: number;
  height: number;
  label?: string;
  onOpen?: () => void;
};

export function MediaVideoThumb({ src, width, height, label, onOpen }: MediaVideoThumbProps) {
  const video = (
    <Box
      component="video"
      src={`${src}#t=0.001`}
      muted
      playsInline
      preload="metadata"
      aria-hidden={onOpen ? undefined : true}
      style={{
        width,
        height,
        objectFit: "cover",
        display: "block",
        borderRadius: "var(--mantine-radius-sm)",
        background: "var(--mantine-color-gray-1)",
        pointerEvents: onOpen ? "none" : undefined,
      }}
    />
  );
  if (!onOpen) {
    return video;
  }
  return (
    <UnstyledButton type="button" aria-label={label} onClick={onOpen} style={{ display: "flex", flex: "none" }}>
      {video}
    </UnstyledButton>
  );
}