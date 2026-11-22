import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/client";
import { formatClock } from "@/shared/lib/format";
import { RecordingPlayback } from "@/shared/ui/RecordingPlayback";
import { Icon } from "@/shared/ui/Icon";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { useMedia } from "../../media/MediaContext";
import { SpeakingResponseMeter } from "./SpeakingResponseMeter";
import { TOEFL_SPEAKING_RECORD_ARM_MS, TOEFL_SPEAKING_RESPONSE_CUE_SRC } from "./speakingCue";
import { trackSpeakingUpload } from "./speakingUploadQueue";

type Recording = { mediaId?: string; durationSeconds?: number };
type Phase = "idle" | "cue" | "preparing" | "recording" | "uploading";

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
  maxSeconds?: number;
  preparationSeconds: number;
  readOnly: boolean;
  onChange: (value: Recording) => void;
  autoFlow?: boolean;
  autoStart?: boolean;
  showRecordCue?: boolean;
  playbackWide?: boolean;
  onComplete?: () => void;
};

export function VoiceRecorder({
  value,
  maxSeconds,
  preparationSeconds,
  readOnly,
  onChange,
  autoFlow = false,
  autoStart = false,
  showRecordCue = false,
  playbackWide = false,
  onComplete,
}: VoiceRecorderProps) {
  const media = useMedia();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const cueAudio = useRef<HTMLAudioElement | null>(null);
  const cueArmTimer = useRef<number | null>(null);
  const started = useRef(0);
  const lastBlob = useRef<{ blob: Blob; extension: string; duration: number } | null>(null);
  const savedUrl = value.mediaId ? media.recording(value.mediaId) : null;
  const playback = localUrl ?? savedUrl;
  const hasRecording = Boolean(value.mediaId || localUrl);
  const timed = typeof maxSeconds === "number" && maxSeconds > 0;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const unmountedRef = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const stopTracks = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  const persistBlob = (blob: Blob, extension: string, duration: number) => {
    const upload = mediaRef.current.upload;
    if (!upload) {
      onChangeRef.current({ durationSeconds: duration });
      return Promise.resolve();
    }
    if (blob.size <= 0) {
      return Promise.resolve();
    }
    return trackSpeakingUpload((async () => {
      const mediaId = await upload(blob, `answer.${extension}`);
      onChangeRef.current({ mediaId, durationSeconds: duration });
    })());
  };

  useEffect(() => () => {
    unmountedRef.current = true;
    clearTimer();
    if (cueArmTimer.current !== null) {
      window.clearTimeout(cueArmTimer.current);
      cueArmTimer.current = null;
    }
    cueAudio.current?.pause();
    cueAudio.current = null;
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.requestData();
      } catch {
      }
      try {
        rec.stop();
      } catch {
        stopTracks();
      }
    } else {
      stopTracks();
    }
  }, []);

  useEffect(() => () => {
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
  }, [localUrl]);

  const playBeepThenRecord = () => {
    cueAudio.current?.pause();
    const audio = new Audio(TOEFL_SPEAKING_RESPONSE_CUE_SRC);
    cueAudio.current = audio;
    const beginRecording = () => {
      cueAudio.current = null;
      void record();
    };
    audio.addEventListener("ended", beginRecording, { once: true });
    audio.addEventListener("error", beginRecording, { once: true });
    void audio.play().catch(() => {
      beginRecording();
    });
  };

  useEffect(() => {
    if (!autoFlow || !autoStart || readOnly || hasRecording) {
      if (phase === "cue") {
        setPhase("idle");
      }
      return;
    }
    if (phase !== "idle") {
      return;
    }
    setPhase("cue");
    cueArmTimer.current = window.setTimeout(() => {
      cueArmTimer.current = null;
      playBeepThenRecord();
    }, TOEFL_SPEAKING_RECORD_ARM_MS);
    return () => {
      if (cueArmTimer.current !== null) {
        window.clearTimeout(cueArmTimer.current);
        cueArmTimer.current = null;
      }
      setPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFlow, autoStart, readOnly, hasRecording]);

  useEffect(() => {
    if (!autoFlow || !value.mediaId || phase !== "idle") {
      return;
    }
    onComplete?.();
  }, [autoFlow, value.mediaId, phase, onComplete]);

  const stop = () => {
    if (recorder.current && recorder.current.state === "recording") {
      try {
        recorder.current.requestData();
      } catch {
      }
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
      if (!unmountedRef.current) {
        setError("Microphone access denied. Allow access in your browser settings and try again.");
        setPhase("idle");
      }
      return;
    }
    if (unmountedRef.current) {
      stopTracks();
      return;
    }
    const chunks: Blob[] = [];
    const instance = new MediaRecorder(stream.current, { mimeType: format.mime });
    recorder.current = instance;
    instance.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    instance.onstop = () => {
      recorder.current = null;
      clearTimer();
      stopTracks();
      const elapsed = Math.round((Date.now() - started.current) / 1000);
      const duration = timed ? Math.min(maxSeconds ?? elapsed, elapsed) : elapsed;
      const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
      lastBlob.current = { blob, extension: format.extension, duration };
      if (!unmountedRef.current) {
        setLocalUrl(URL.createObjectURL(blob));
        setPhase("uploading");
      }
      void persistBlob(blob, format.extension, duration)
        .catch((uploadError) => {
          if (!unmountedRef.current) {
            setError(errorMessage(uploadError, "Could not save the recording. Please try again."));
          }
        })
        .finally(() => {
          if (!unmountedRef.current) {
            setPhase("idle");
          }
        });
    };
    started.current = Date.now();
    setSeconds(0);
    instance.start(1000);
    setPhase("recording");
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(elapsed);
      if (timed && elapsed >= maxSeconds) {
        stop();
      }
    }, 250);
  };

  const retryUpload = async () => {
    if (!media.upload || !lastBlob.current) {
      return;
    }
    setError("");
    setPhase("uploading");
    try {
      await persistBlob(lastBlob.current.blob, lastBlob.current.extension, lastBlob.current.duration);
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Could not save the recording. Please try again."));
    }
    setPhase("idle");
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

  const status = (() => {
    if (phase === "preparing") {
      return `Preparation: ${formatClock(seconds)}`;
    }
    if (phase === "recording") {
      return timed
        ? `Recording: ${formatClock(seconds)} / ${formatClock(maxSeconds)}`
        : `Recording: ${formatClock(seconds)}`;
    }
    if (phase === "uploading") {
      return "Saving…";
    }
    if (hasRecording) {
      return `Recorded: ${formatClock(value.durationSeconds ?? 0)}`;
    }
    return timed ? `Time limit: ${formatClock(maxSeconds)}` : "Recording";
  })();

  if (readOnly) {
    if (autoFlow && !savedUrl) {
      return null;
    }
    return savedUrl ? (
      <RecordingPlayback
        src={savedUrl}
        durationSeconds={value.durationSeconds}
        wide={playbackWide}
        aria-label="Recorded answer"
      />
    ) : (
      <Text c="dimmed" fw={500}>No recording</Text>
    );
  }

  if (autoFlow) {
    const responseActive = phase === "recording" || phase === "uploading";
    const showResponseBlock = timed && (phase === "cue" || responseActive);
    const remaining = timed
      ? (responseActive ? Math.max(0, maxSeconds - seconds) : maxSeconds)
      : 0;
    return (
      <Stack gap="sm" align="center" w="100%">
        {phase === "cue" && showRecordCue ? (
          <Alert color="yellow" variant="light" p="sm" w="100%" maw={480}>
            Your response will be recorded. You will hear a tone when recording starts
          </Alert>
        ) : null}
        {showResponseBlock ? (
          <SpeakingResponseMeter remainingSeconds={remaining} totalSeconds={maxSeconds} />
        ) : null}
        {phase === "recording" && !timed ? (
          <Button variant="default" size="sm" color="red" leftSection={<Icon name="stop" />} onClick={stop}>
            Stop
          </Button>
        ) : null}
        {error ? (
          <Stack gap="sm" w="100%" maw={480}>
            <Alert color="red" variant="light" role="alert">
              {error}
            </Alert>
            {lastBlob.current ? (
              <Button size="sm" variant="default" onClick={() => void retryUpload()}>
                Send again
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    );
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
        <RecordingPlayback
          src={playback}
          durationSeconds={value.durationSeconds}
          aria-label="Play recording"
        />
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
