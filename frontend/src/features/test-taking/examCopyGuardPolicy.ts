const EDITABLE = "input, textarea, select, [contenteditable='true']";
const PROTECTED_CONTENT = ".iba-test-copy, .iba-prompt, .iba-blockquote, .iba-task-media, .iba-video-player, video, img";
const EXAM_SURFACE = "[data-runner-layout], [data-take-intro]";

export function isEditableElement(node: EventTarget | null): boolean {
  return node instanceof HTMLElement && Boolean(node.closest(EDITABLE));
}

export function examSurfaceRoot(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof HTMLElement)) {
    return null;
  }
  return node.closest(EXAM_SURFACE);
}

function nodeElement(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as HTMLElement;
  }
  return node.parentElement;
}

export function shouldBlockExamClipboard(surface: HTMLElement | null): boolean {
  if (!surface) {
    return false;
  }
  const sel = document.getSelection();
  if (!sel || sel.isCollapsed) {
    return false;
  }
  const anchorEl = nodeElement(sel.anchorNode);
  const focusEl = nodeElement(sel.focusNode);
  if (!anchorEl || !focusEl) {
    return false;
  }
  if (!surface.contains(anchorEl) || !surface.contains(focusEl)) {
    return false;
  }
  if (anchorEl.closest(EDITABLE) || focusEl.closest(EDITABLE)) {
    return false;
  }
  return true;
}

export function shouldBlockExamContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (isEditableElement(target)) {
    return false;
  }
  return Boolean(target.closest(PROTECTED_CONTENT));
}