import { useEffect } from "react";
import {
  examSurfaceRoot,
  isEditableElement,
  shouldBlockExamClipboard,
  shouldBlockExamContextMenu,
} from "./examCopyGuardPolicy";

export function ExamCopyGuard() {
  useEffect(() => {
    const onCopy = (event: ClipboardEvent) => {
      const surface = examSurfaceRoot(event.target);
      if (!surface || isEditableElement(event.target)) {
        return;
      }
      if (shouldBlockExamClipboard(surface)) {
        event.preventDefault();
      }
    };
    const onCut = (event: ClipboardEvent) => {
      onCopy(event);
    };
    const onContextMenu = (event: MouseEvent) => {
      const surface = examSurfaceRoot(event.target);
      if (!surface) {
        return;
      }
      if (shouldBlockExamContextMenu(event.target)) {
        event.preventDefault();
      }
    };
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, []);
  return null;
}