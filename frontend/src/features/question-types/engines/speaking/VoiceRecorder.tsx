import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/client";
import { formatClock } from "@/shared/lib/format";
import { AppAudio } from "@/shared/ui/AppAudio";
import { Icon } from "@/shared/ui/Icon";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { useMedia } from "../../media/MediaContext";

type Recording = { mediaId?: string; durationSeconds?: number };
type Phase = "idle" | "preparing" | "recording" | "uploading";

const FORMATS = [
  { mime: "audio/webm;codecs=opus", extension: "webm" },
  { mime: "audio/webm", extension: "webm" },
  { mime: "audio/mp4", extension: "m4a" },
  { mime: "audio/ogg;codecs=opus", extension: "ogg" },
];

function pickFormat() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  return FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mime)) ?? null;
}

type VoiceRecorderProps = {
  value: Recording;
  maxSeconds: number;
  preparationSeconds: number;
  readOnly: boolean;
  onChange: (value: Recording) => void;
};

export function VoiceRecorder({ value, maxSeconds, preparationSeconds, readOnly, onChange }: VoiceRecorderProps) {
  const media = useMedia();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const started = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => () => {
    clearTimer();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => {
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
  }, [localUrl]);

  const stop = () => {
    if (recorder.current && recorder.current.state === "recording") {
      recorder.current.stop();
    }
  };

  const record = async () => {
    setError("");
    const format = pickFormat();
    if (!format || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser. Try Chrome, Firefox, Edge or Safari.");
      setPhase("idle");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Allow access in your browser settings and try again.");
      setPhase("idle");
      return;
    }
    const chunks: Blob[] = [];
    const instance = new MediaRecorder(stream.current, { mimeType: format.mime });
    recorder.current = instance;
    instance.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    instance.onstop = async () => {
      clearTimer();
      stream.current?.getTracks().forEach((track) => track.stop());
      const duration = Math.min(maxSeconds, Math.round((Date.now() - started.current) / 1000));
      const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
      setLocalUrl(URL.createObjectURL(blob));
      if (!media.upload) {
        setPhase("idle");
        onChange({ durationSeconds: duration });
        return;
      }
      setPhase("uploading");
      try {
        const mediaId = await media.upload(blob, `answer.${format.extension}`);
        onChange({ mediaId, durationSeconds: duration });
      } catch (uploadError) {
        setError(errorMessage(uploadError, "Could not save the recording. Please try again."));
      }
      setPhase("idle");
    };
    started.current = Date.now();
    setSeconds(0);
    instance.start(1000);
    setPhase("recording");
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) {
        stop();
      }
    }, 250);
  };

  const prepare = () => {
    if (preparationSeconds <= 0) {
      void record();
      return;
    }
    const begin = Date.now();
    setSeconds(preparationSeconds);
    setPhase("preparing");
    timer.current = window.setInterval(() => {
      const left = preparationSeconds - Math.floor((Date.now() - begin) / 1000);
      setSeconds(left);
      if (left <= 0) {
        clearTimer();
        void record();
      }
    }, 250);
  };

  const savedUrl = value.mediaId ? media.recording(value.mediaId) : null;
  const playback = localUrl ?? savedUrl;
  const hasRecording = Boolean(value.mediaId || localUrl);

  const status = (() => {
    if (phase === "preparing") {
      return `Preparation: ${formatClock(seconds)}`;
    }
    if (phase === "recording") {
      return `Recording: ${formatClock(seconds)} / ${formatClock(maxSeconds)}`;
    }
    if (phase === "uploading") {
      return "Saving…";
    }
    if (hasRecording) {
      return `Recorded: ${formatClock(value.durationSeconds ?? 0)}`;
    }
    return `Time limit: ${formatClock(maxSeconds)}`;
  })();

  if (readOnly) {
    return savedUrl
      ? <AppAudio src={savedUrl} aria-label="Recorded answer" />
      : <Text c="dimmed" fw={500}>No recording</Text>;
  }

  return (
    <Stack gap="sm">
      <Text
        fw={500}
        c={phase === "recording" ? "red" : undefined}
        style={{ fontVariantNumeric: "tabular-nums" }}
        aria-live="polite"
      >
        {status}
      </Text>
      <Group gap="md">
        {phase === "idle" && (
          <Button variant="default" size="sm" leftSection={<Icon name="mic" />} onClick={prepare}>
            {hasRecording ? "Record again" : preparationSeconds > 0 ? "Start preparation" : "Start recording"}
          </Button>
        )}
        {phase === "preparing" && (
          <Button variant="default" size="sm" leftSection={<Icon name="mic" />} onClick={() => { clearTimer(); void record(); }}>
            Start recording now
          </Button>
        )}
        {phase === "recording" && (
          <Button variant="default" size="sm" color="red" leftSection={<Icon name="stop" />} onClick={stop}>
            Stop
          </Button>
        )}
      </Group>
      {playback && phase === "idle" ? (
        <AppAudio src={playback} aria-label="Play recording" />
      ) : null}
      {!media.upload && (localUrl || phase === "recording") ? (
        <SettingsHint>Preview only – recording is not saved</SettingsHint>
      ) : null}
      {error ? (
        <Alert color="red" variant="light" role="alert">
          {error}
        </Alert>
      ) : null}
    </Stack>
  );
}
