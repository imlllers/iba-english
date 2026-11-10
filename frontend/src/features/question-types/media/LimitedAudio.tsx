import { Button, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { AppAudio } from "@/shared/ui/AppAudio";

type LimitedAudioProps = {
  src: string;
  limit: number;
  storageKey?: string;
  label: string;
  compact?: boolean;
  locked?: boolean;
  playEnabled?: boolean;
  autoPlay?: boolean;
  completed?: boolean;
  onEnded?: () => void;
  onAutoPlayBlocked?: () => void;
};

function readPlays(key?: string) {
  return key ? Number(localStorage.getItem(key) ?? "0") : 0;
}

export function LimitedAudio({
  src,
  limit,
  storageKey,
  label,
  compact = false,
  locked = false,
  playEnabled = true,
  autoPlay = false,
  completed = false,
  onEnded,
  onAutoPlayBlocked,
}: LimitedAudioProps) {
  const timeRef = useRef(0);
  const [plays, setPlays] = useState(() => readPlays(storageKey));
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const autoTried = useRef(false);
  const enforced = limit > 0 && Boolean(storageKey);
  const exhausted = enforced && plays >= limit && !playing;
  const done = completed || finished;
  const canStart = playEnabled && !done && !exhausted && !started;

  useEffect(() => {
    if (!autoPlay || !playEnabled || done || exhausted || autoTried.current || started) {
      return;
    }
    autoTried.current = true;
    setPlaying(true);
  }, [autoPlay, playEnabled, done, exhausted, started]);

  useEffect(() => {
    if (!autoPlay || !playing || done) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (timeRef.current === 0) {
        setPlaying(false);
        setStarted(false);
        onAutoPlayBlocked?.();
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [autoPlay, playing, done, onAutoPlayBlocked]);

  const srcRef = useRef(src);
  useEffect(() => {
    if (srcRef.current === src) {
      return;
    }
    srcRef.current = src;
    autoTried.current = false;
    setStarted(false);
    setFinished(false);
    setPlaying(false);
    timeRef.current = 0;
  }, [src]);

  if (done && locked) {
    return (
      <Text size={compact ? "xs" : "sm"} c="dimmed" mb={compact ? 0 : "md"}>
        Audio played
      </Text>
    );
  }

  return (
    <Stack gap={compact ? 2 : 6} mb={compact ? 0 : "md"}>
      {exhausted ? (
        <Text size="sm">The recording has been played the maximum number of times</Text>
      ) : (
        <AppAudio
          src={src}
          aria-label={label}
          maw={compact ? 360 : 420}
          size={compact ? "xs" : "sm"}
          variant={compact ? "minimal" : "bordered"}
          playing={locked || autoPlay ? playing : undefined}
          onCurrentTimeChange={(time) => {
            timeRef.current = time;
          }}
          onPlayChange={(next) => {
            if (locked && started && !next && !finished) {
              setPlaying(true);
              return;
            }
            if (!next && !started && autoPlay && autoTried.current) {
              setPlaying(false);
              onAutoPlayBlocked?.();
              return;
            }
            if (next && !started) {
              if (!playEnabled || done) {
                setPlaying(false);
                return;
              }
              if (enforced) {
                const nextPlays = plays + 1;
                if (nextPlays > limit) {
                  setPlaying(false);
                  return;
                }
                setPlays(nextPlays);
                localStorage.setItem(storageKey!, String(nextPlays));
              }
              setStarted(true);
            }
            setPlaying(next);
          }}
          onEnded={() => {
            setPlaying(false);
            setFinished(true);
            onEnded?.();
          }}
        >
          {locked ? (
            <AppAudio.Controls>
              <AppAudio.PlayButton disabled={!canStart && !playing} />
              <AppAudio.Timeline liveScrub={false} sliderProps={{ disabled: true, styles: { thumb: { display: "none" } } }} />
              <AppAudio.TimeDisplay />
            </AppAudio.Controls>
          ) : undefined}
        </AppAudio>
      )}
      {locked && !playEnabled && !done && !exhausted ? (
        <Text size={compact ? "xs" : "sm"} c="dimmed">
          Finish the previous audio first
        </Text>
      ) : null}
      {limit > 0 && (
        <Text size={compact ? "xs" : "sm"} c="dimmed">
          {enforced ? `Plays left: ${Math.max(0, limit - plays)} of ${limit}` : `Участник сможет прослушать запись ${limit} раз`}
        </Text>
      )}
    </Stack>
  );
}

export function ListenFallbackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button color="iba" onClick={onClick}>
      Play
    </Button>
  );
}
