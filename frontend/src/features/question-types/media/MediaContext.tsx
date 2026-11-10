import { createContext, useContext, type ReactNode } from "react";
import { teacherMediaUrl } from "@/features/media-library/mediaApi";

export type MediaResolver = {
  asset: (id: string) => string;
  recording: (id: string) => string;
  upload?: (blob: Blob, name: string) => Promise<string>;
  playbackScope?: string;
};

const teacherResolver: MediaResolver = { asset: teacherMediaUrl, recording: teacherMediaUrl };

const MediaContext = createContext<MediaResolver>(teacherResolver);

export function MediaProvider({ value, children }: { value: MediaResolver; children: ReactNode }) {
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMedia() {
  return useContext(MediaContext);
}
