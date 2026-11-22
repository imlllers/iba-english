import { Box, Image, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import type { ContentItem } from "@/entities/question/types";
import { LimitedAudio } from "../media/LimitedAudio";
import { useMedia } from "../media/MediaContext";
import { PromptView } from "../prompt/PromptView";
import { VideoPlayer } from "@/shared/ui/VideoPlayer";
import { contentItemFilled } from "./contentItems";
import { TASK_MEDIA_MAX, TASK_MEDIA_ROW } from "./taskMediaLayout";

export type ExamAudioBinding = {
  keyFor: (item: ContentItem) => string | null;
  locked: boolean;
  autoPlay: boolean;
  completed: ReadonlySet<string>;
  activeKey: string | null;
  remountToken?: number;
  onEnded: (key: string) => void;
  onStarted?: (key: string) => void;
  onDurationKnown?: (key: string) => void;
  onAutoPlayBlocked?: () => void;
  hidden?: boolean;
};

const HIDDEN_PLAYER = { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" } as const;

type ContentFeedViewProps = {
  items: ContentItem[];
  promptId?: string;
  renderPrompt?: (item: ContentItem) => ReactNode;
  playbackLimit?: number;
  playbackKey?: string;
  examAudio?: ExamAudioBinding;
  hideAudio?: boolean;
  autoPlayVideo?: boolean;
  hideVideoControls?: boolean;
  teacherReview?: boolean;
};

export function ContentFeedView({
  items,
  promptId,
  renderPrompt,
  playbackLimit = 0,
  playbackKey,
  examAudio,
  hideAudio = false,
  autoPlayVideo = false,
  hideVideoControls = false,
  teacherReview = false,
}: ContentFeedViewProps) {
  const media = useMedia();
  const visible = items.filter((item) => (item.id === promptId ? Boolean(renderPrompt) : contentItemFilled(item)));
  if (visible.length === 0) {
    return null;
  }
  return (
    <Stack gap="md">
      {visible.map((item) => {
        if (item.kind === "text") {
          if (item.id === promptId) {
            const node = renderPrompt?.(item);
            return node ? <Box key={item.id}>{node}</Box> : null;
          }
          return <PromptView key={item.id} doc={item.doc ?? { type: "doc" }} />;
        }
        const src = media.asset(item.mediaId!);
        if (teacherReview && (item.kind === "image" || item.kind === "audio" || item.kind === "video")) {
          return null;
        }
        if (item.kind === "image") {
          return (
            <Box key={item.id} className="iba-task-media" style={TASK_MEDIA_ROW}>
              <Image
                src={src}
                alt="Task material"
                radius="sm"
                fit="contain"
                w="auto"
                h="auto"
                style={TASK_MEDIA_MAX}
              />
            </Box>
          );
        }
        if (item.kind === "audio" && hideAudio) {
          return null;
        }
        if (item.kind === "video") {
          return (
            <Box key={item.id} className="iba-task-media" style={TASK_MEDIA_ROW}>
              <VideoPlayer
                src={src}
                aria-label="Task video"
                autoPlay={autoPlayVideo}
                seekable={!hideVideoControls}
                controlsHidden={hideVideoControls}
                style={{ width: "100%", ...TASK_MEDIA_MAX }}
              />
            </Box>
          );
        }
        const gateKey = examAudio?.keyFor(item) ?? null;
        const locked = Boolean(examAudio?.locked && gateKey);
        return (
          <Box
            key={gateKey && gateKey === examAudio?.activeKey ? `${item.id}-${examAudio.remountToken ?? 0}` : item.id}
            data-exam-audio-key={gateKey ?? undefined}
            style={gateKey && examAudio?.hidden ? HIDDEN_PLAYER : { display: "flex", justifyContent: "center", width: "100%" }}
          >
            <LimitedAudio
              src={src}
              limit={playbackLimit}
              storageKey={playbackKey ? `${playbackKey}:${item.mediaId}` : undefined}
              label="Task audio"
              locked={locked}
              playEnabled={!locked || gateKey === examAudio?.activeKey || Boolean(gateKey && examAudio?.completed.has(gateKey))}
              autoPlay={Boolean(locked && examAudio?.autoPlay && gateKey === examAudio.activeKey)}
              completed={Boolean(gateKey && examAudio?.completed.has(gateKey))}
              onEnded={gateKey && examAudio ? () => examAudio.onEnded(gateKey) : undefined}
              onStarted={gateKey && examAudio?.onStarted ? () => examAudio.onStarted!(gateKey) : undefined}
              onDurationKnown={gateKey && examAudio?.onDurationKnown ? () => examAudio.onDurationKnown!(gateKey) : undefined}
              onAutoPlayBlocked={examAudio?.onAutoPlayBlocked}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
