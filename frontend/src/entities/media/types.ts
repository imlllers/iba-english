export type MediaKind = "image" | "audio" | "video" | "application";

export type MediaAsset = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  folderId?: string | null;
};

export type MediaFolder = {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
};

export type MediaPathItem = {
  id: string;
  name: string;
};

export type MediaBrowse = {
  folderId: string | null;
  folderName: string;
  path: MediaPathItem[];
  folders: MediaFolder[];
  items: MediaAsset[];
  page: number;
  size: number;
  total: number;
  searching: boolean;
};
