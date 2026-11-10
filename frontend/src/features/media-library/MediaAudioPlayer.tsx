import { ActionIcon, Box, Group, Slider, Text } from "@mantine/core";
import { useEffect, useId, useRef, useState } from "react";
import { formatClock } from "@/shared/lib/format";
import { IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react";

type MediaAudioPlayerProps = {
  src: string;
  label: string;
  compact?: boolean;
  className?: string;
};

let activeAudio: HTMLAudioElement | null = null;

function releaseActive(node: HTMLAudioElement | null) {
  if (activeAudio === node) {
    activeAudio = null;
  }
}

export function MediaAudioPlayer({ src, label, compact = false, className }: MediaAudioPlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const labelId = useId();
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const node = audio.current;
    if (!node) return;
    const sync = () => {
      setCurrent(node.currentTime);
      setDuration(Number.isFinite(node.duration) ? node.duration : 0);
    };
    const onPlay = () => {
      if (activeAudio && activeAudio !== node) activeAudio.pause();
      activeAudio = node;
      setPlaying(true);
    };
    const onPause = () => {
      setPlaying(false);
      releaseActive(node);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      node.currentTime = 0;
      releaseActive(node);
    };
    node.addEventListener("timeupdate", sync);
    node.addEventListener("loadedmetadata", sync);
    node.addEventListener("durationchange", sync);
    node.addEventListener("play", onPlay);
    node.addEventListener("pause", onPause);
    node.addEventListener("ended", onEnded);
    return () => {
      node.removeEventListener("timeupdate", sync);
      node.removeEventListener("loadedmetadata", sync);
      node.removeEventListener("durationchange", sync);
      node.removeEventListener("play", onPlay);
      node.removeEventListener("pause", onPause);
      node.removeEventListener("ended", onEnded);
      node.pause();
      releaseActive(node);
    };
  }, [src]);

  const toggle = async () => {
    const node = audio.current;
    if (!node) return;
    if (node.paused) {
      try {
        await node.play();
      } catch {
        setPlaying(false);
      }
    } else {
      node.pause();
    }
  };

  const seek = (value: number) => {
    const node = audio.current;
    if (!node || !Number.isFinite(node.duration) || node.duration <= 0) return;
    node.currentTime = value;
    setCurrent(value);
  };

  const toggleButton = (
    <ActionIcon
      variant="filled"
      color="iba"
      radius="xl"
      size={compact ? 32 : 28}
      aria-label={playing ? `Стоп: ${label}` : `Слушать: ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
    >
      {playing ? <IconPlayerPauseFilled size={compact ? 16 : 14} /> : <IconPlayerPlayFilled size={compact ? 16 : 14} />}
    </ActionIcon>
  );

  if (compact) {
    return (
      <Box className={className} w={40} h={40} style={{ display: "grid", placeItems: "center" }}>
        <audio ref={audio} src={src} preload="none" aria-labelledby={labelId} />
        <span id={labelId} className="sr-only">{label}</span>
        {toggleButton}
      </Box>
    );
  }

  return (
    <Group
      className={className}
      gap="xs"
      wrap="nowrap"
      p={4}
      style={{
        minWidth: 0,
        borderRadius: 999,
        background: "color-mix(in srgb, white 88%, transparent)",
        boxShadow: "var(--mantine-shadow-sm)",
      }}
    >
      <audio ref={audio} src={src} preload="metadata" aria-labelledby={labelId} />
      <span id={labelId} className="sr-only">{label}</span>
      {toggleButton}
      <Slider
        flex={1}
        min={0}
        max={duration || 1}
        step={0.1}
        value={current}
        label={null}
        aria-label={`Позиция: ${label}`}
        onChange={seek}
        styles={{ track: { cursor: "pointer" } }}
      />
      <Text size="xs" c="dimmed" fw={600} style={{ minWidth: "2.6em", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {formatClock(playing || current > 0 ? current : duration)}
      </Text>
    </Group>
  );
}
