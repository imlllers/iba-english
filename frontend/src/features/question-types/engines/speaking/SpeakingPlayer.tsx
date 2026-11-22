import { Box, Stack } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { PlayerProps } from "../types";
import { contentItemFilled, questionItems } from "../../content/contentItems";
import { LimitedAudio } from "../../media/LimitedAudio";
import type { MediaResolver } from "../../media/MediaContext";
import type { ExamAudioBinding } from "../../content/ContentFeedView";
import { TASK_MEDIA_MAX, TASK_MEDIA_ROW } from "../../content/taskMediaLayout";
import { TOEFL_SPEAKING_VIDEO_DELAY_MS } from "@/features/test-taking/layouts/toefl/questionTaskVideo";
import { VideoPlayer } from "@/shared/ui/VideoPlayer";
import { VoiceRecorder } from "./VoiceRecorder";
import { speakingRecordLimitSeconds } from "./speakingRecordLimit";

type SpeakingPlayerProps = PlayerProps & {
  autoFlow?: boolean;
  promptAudioReady?: boolean;
  promptAudioInFeed?: boolean;
  onComplete?: () => void;
  examAudio?: ExamAudioBinding;
  media?: MediaResolver | null;
};

export function SpeakingPlayer({
  question,
  answer,
  onAnswer,
  readOnly,
  examType,
  autoFlow = false,
  promptAudioReady = true,
  promptAudioInFeed = false,
  onComplete,
  examAudio,
  media,
}: SpeakingPlayerProps) {
  const promptAudio = useMemo(
    () => questionItems(question).find((item) => item.kind === "audio" && item.mediaId),
    [question],
  );
  const promptVideo = useMemo(
    () => questionItems(question).find((item) => item.kind === "video" && contentItemFilled(item)),
    [question],
  );
  const hasPrompt = Boolean(promptAudio || promptVideo);
  const [promptDone, setPromptDone] = useState(() => !autoFlow || !hasPrompt);
  const audioKey = promptAudio ? `question:${question.id}:${promptAudio.id}` : null;
  const videoKey = promptVideo ? `question:${question.id}:video:${promptVideo.id}` : null;
  const alreadyDone = audioKey && examAudio?.completed?.has(audioKey);

  useEffect(() => {
    if (!autoFlow || !hasPrompt) {
      setPromptDone(true);
      return;
    }
    if (promptVideo) {
      return;
    }
    if (alreadyDone) {
      setPromptDone(true);
      return;
    }
    if (promptAudioInFeed && promptAudio) {
      setPromptDone(false);
    }
  }, [autoFlow, hasPrompt, promptAudio, promptVideo, promptAudioInFeed, alreadyDone, question.id]);

  const finishAudioPrompt = () => {
    if (promptVideo) {
      return;
    }
    setPromptDone(true);
    if (audioKey && examAudio?.onEnded && !alreadyDone) {
      examAudio.onEnded(audioKey);
    }
  };

  const finishVideoPrompt = () => {
    setPromptDone(true);
  };

  const gateOwnsPrompt = Boolean(examAudio?.locked && audioKey);
  const promptAudioActive = !gateOwnsPrompt || audioKey === examAudio?.activeKey;
  const promptAutoPlay = gateOwnsPrompt
    ? Boolean(
      examAudio?.autoPlay
      && promptAudioReady
      && promptAudioActive
      && !alreadyDone,
    )
    : Boolean(promptAudioReady && !alreadyDone);

  const showTaskVideo = Boolean(autoFlow && promptVideo && media);
  const showPromptPlayer = Boolean(
    autoFlow
    && promptAudio
    && media
    && !promptVideo
    && !promptDone
    && !promptAudioInFeed
    && promptAudioReady
    && promptAudioActive,
  );

  return (
    <Stack gap="md" align="center" w="100%">
      {showTaskVideo ? (
        <Box className="iba-task-media" w="100%" style={TASK_MEDIA_ROW}>
          <VideoPlayer
            src={media!.asset(promptVideo!.mediaId!)}
            aria-label="Task video"
            autoPlay={promptAudioReady && !promptDone}
            autoPlayDelayMs={TOEFL_SPEAKING_VIDEO_DELAY_MS}
            seekable={false}
            controlsHidden
            onEnded={finishVideoPrompt}
            onPlayStart={
              videoKey && examAudio?.onStarted ? () => examAudio.onStarted!(videoKey) : undefined
            }
            style={{ width: "100%", ...TASK_MEDIA_MAX }}
          />
        </Box>
      ) : null}
      {showPromptPlayer ? (
        <Box
          data-exam-audio-key={audioKey ?? undefined}
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          <LimitedAudio
            key={gateOwnsPrompt ? `${audioKey}-${examAudio?.remountToken ?? 0}` : audioKey ?? question.id}
            src={media!.asset(promptAudio!.mediaId!)}
            limit={0}
            label="Task"
            locked={gateOwnsPrompt}
            playEnabled={promptAudioActive}
            autoPlay={promptAutoPlay}
            completed={Boolean(alreadyDone)}
            onEnded={finishAudioPrompt}
            onAutoPlayBlocked={examAudio?.onAutoPlayBlocked}
          />
        </Box>
      ) : null}
      <VoiceRecorder
        value={{ mediaId: answer.mediaId as string | undefined, durationSeconds: answer.durationSeconds as number | undefined }}
        maxSeconds={speakingRecordLimitSeconds(question.settings.maxSeconds, examType)}
        preparationSeconds={question.settings.preparationSeconds ?? 0}
        readOnly={readOnly}
        autoFlow={autoFlow}
        autoStart={autoFlow && promptDone && promptAudioReady}
        showRecordCue={Boolean(promptVideo)}
        onChange={(value) => onAnswer(value)}
        onComplete={onComplete}
      />
    </Stack>
  );
}