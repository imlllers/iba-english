import type { CSSProperties } from "react";

export const TASK_MEDIA_MAX: CSSProperties = {
  maxWidth: "min(100%, var(--runner-task-media-width, 480px))",
  maxHeight: "var(--runner-task-media-height, 360px)",
};

export const TASK_MEDIA_ROW: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  width: "100%",
};