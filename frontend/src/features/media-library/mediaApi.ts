import { api, formData, json, queryString } from "@/shared/api/client";
import type { MediaAsset, MediaBrowse, MediaFolder, MediaKind } from "@/entities/media/types";

export type MediaQuery = {
  folderId?: string | null;
  q?: string;
  kind?: MediaKind | "";
  page?: number;
  size?: number;
};

export const mediaApi = {
  list: (query: MediaQuery) => api<MediaBrowse>(`/api/teacher/media${queryString({
    folderId: query.folderId ?? undefined,
    q: query.q,
    kind: query.kind,
    page: query.page,
    size: query.size,
  })}`),
  upload: (file: File, folderId?: string | null) => {
    const request = formData(file) as RequestInit & { body: FormData };
    if (folderId) {
      request.body.append("folderId", folderId);
    }
    return api<MediaAsset>("/api/teacher/media", request);
  },
  uploadForTest: (file: File) => {
    const request = formData(file) as RequestInit & { body: FormData };
    request.body.append("library", "false");
    return api<MediaAsset>("/api/teacher/media", request);
  },
  moveAsset: (id: string, folderId: string | null) =>
    api<MediaAsset>(`/api/teacher/media/${id}`, json("PATCH", { folderId: folderId ?? "" })),
  renameAsset: (id: string, filename: string) =>
    api<MediaAsset>(`/api/teacher/media/${id}`, json("PATCH", { filename })),
  deleteAsset: (id: string) => api<void>(`/api/teacher/media/${id}`, json("DELETE")),
  folders: () => api<MediaFolder[]>("/api/teacher/media/folders"),
  createFolder: (name: string, parentId?: string | null) =>
    api<MediaFolder>("/api/teacher/media/folders", json("POST", { name, parentId: parentId ?? null })),
  renameFolder: (id: string, name: string) =>
    api<MediaFolder>(`/api/teacher/media/folders/${id}`, json("PATCH", { name })),
  moveFolder: (id: string, parentId: string | null) =>
    api<MediaFolder>(`/api/teacher/media/folders/${id}`, json("PATCH", { parentId: parentId ?? "" })),
  deleteFolder: (id: string) => api<void>(`/api/teacher/media/folders/${id}`, json("DELETE")),
};

export function teacherMediaUrl(id: string) {
  return `/api/teacher/media/${id}/content`;
}

export function mediaKindOf(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "application";
}
