import { Box, Image, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import type { ContentItem } from "@/entities/question/types";
import { LimitedAudio } from "../media/LimitedAudio";
import { useMedia } from "../media/MediaContext";
import { PromptView } from "../prompt/PromptView";
import { contentItemFilled } from "./contentItems";

export type ExamAudioBinding = {
  keyFor: (item: ContentItem) => string | null;
  locked: boolean;
  autoPlay: boolean;
  completed: ReadonlySet<string>;
  activeKey: string | null;
  remountToken?: number;
  onEnded: (key: string) => void;
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
};

export function ContentFeedView({
  items,
  promptId,
  renderPrompt,
  playbackLimit = 0,
  playbackKey,
  examAudio,
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
        if (item.kind === "image") {
          return (
            <Box key={item.id} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <Image src={src} alt="Task material" maw={480} radius="sm" />
            </Box>
          );
        }
        if (item.kind === "video") {
          return (
            <Box key={item.id} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <Box
                component="video"
                src={src}
                controls
                preload="metadata"
                aria-label="Task video"
                maw="100%"
                mah={360}
                style={{ display: "block" }}
              />
            </Box>
          );
        }
        const gateKey = examAudio?.keyFor(item) ?? null;
        const locked = Boolean(examAudio?.locked && gateKey);
        return (
          <Box
            key={gateKey && gateKey === examAudio?.activeKey ? `${item.id}-${examAudio.remountToken ?? 0}` : item.id}
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
              onAutoPlayBlocked={examAudio?.onAutoPlayBlocked}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
