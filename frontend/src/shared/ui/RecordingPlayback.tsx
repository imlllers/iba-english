import { ActionIcon, Box, Group, Slider, Text } from "@mantine/core";
import { IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/shared/lib/format";

function playbackDuration(meta: number, hint: number | undefined, peak: number): number {
  const parts = [meta, hint ?? 0, peak].filter((value) => value > 0 && Number.isFinite(value));
  return parts.length ? Math.max(...parts) : 0;
}

type RecordingPlaybackProps = {
  src: string;
  durationSeconds?: number;
  wide?: boolean;
  bordered?: boolean;
  "aria-label"?: string;
};

export function RecordingPlayback({
  src,
  durationSeconds,
  wide = false,
  bordered = true,
  "aria-label": ariaLabel = "Recorded answer",
}: RecordingPlaybackProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [metaDuration, setMetaDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [peakTime, setPeakTime] = useState(0);

  useEffect(() => {
    setMetaDuration(0);
    setCurrent(0);
    setPeakTime(0);
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    const node = audio.current;
    if (!node) {
      return undefined;
    }
    const readMeta = () => {
      const next = Number.isFinite(node.duration) ? node.duration : 0;
      if (next > 0) {
        setMetaDuration(next);
      }
    };
    const onTime = () => {
      setCurrent(node.currentTime);
      setPeakTime((peak) => Math.max(peak, node.currentTime));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      onTime();
    };
    node.addEventListener("loadedmetadata", readMeta);
    node.addEventListener("durationchange", readMeta);
    node.addEventListener("timeupdate", onTime);
    node.addEventListener("play", onPlay);
    node.addEventListener("pause", onPause);
    node.addEventListener("ended", onEnded);
    readMeta();
    return () => {
      node.removeEventListener("loadedmetadata", readMeta);
      node.removeEventListener("durationchange", readMeta);
      node.removeEventListener("timeupdate", onTime);
      node.removeEventListener("play", onPlay);
      node.removeEventListener("pause", onPause);
      node.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const total = playbackDuration(metaDuration, durationSeconds, peakTime);
  const sliderMax = total > 0 ? total : 1;

  const toggle = async () => {
    const node = audio.current;
    if (!node) {
      return;
    }
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
    if (!node) {
      return;
    }
    node.currentTime = value;
    setCurrent(value);
  };

  return (
    <Box
      w="100%"
      maw={wide ? undefined : 420}
      px={bordered ? "sm" : 0}
      py={bordered ? "xs" : 0}
      tabIndex={0}
      style={{
        border: bordered ? "1px solid var(--mantine-color-default-border)" : undefined,
        borderRadius: bordered ? "var(--mantine-radius-md)" : undefined,
        "--audio-color": "var(--mantine-color-iba-filled)",
      }}
    >
      <audio ref={audio} src={src} preload="auto" aria-label={ariaLabel} />
      <Group gap="sm" wrap="nowrap" align="center">
        <ActionIcon
          variant="filled"
          color="iba"
          radius="xl"
          size="md"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => void toggle()}
        >
          {playing ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
        </ActionIcon>
        <Slider
          flex={1}
          min={0}
          max={sliderMax}
          step={0.05}
          value={Math.min(current, sliderMax)}
          label={null}
          onChange={seek}
          styles={{ track: { cursor: "pointer" } }}
        />
        <Text size="sm" ff="var(--mantine-font-family)" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {formatClock(current)} / {formatClock(total)}
        </Text>
      </Group>
    </Box>
  );
}