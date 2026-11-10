import type { ContentItem, Doc, DocNode } from "@/entities/question/types";
import { contentItemFilled } from "./contentItems";

export const passageFrameStyle = {
  border: "1px solid var(--mantine-color-gray-4)",
  borderRadius: "var(--mantine-radius-sm)",
  padding: "var(--mantine-spacing-md)",
  width: "fit-content",
  maxWidth: "100%",
  marginInline: "auto",
} as const;

function isMeaningfulBlock(node: DocNode): boolean {
  if (node.type === "table") {
    return true;
  }
  if (node.type === "paragraph" || node.type === "heading") {
    return Boolean(node.content?.length);
  }
  return true;
}

export function docIsOnlyTable(doc: Doc | null | undefined): boolean {
  const meaningful = (doc?.content ?? []).filter(isMeaningfulBlock);
  return meaningful.length > 0 && meaningful.every((node) => node.type === "table");
}

export function shouldFrameContentItems(items: ContentItem[]): boolean {
  const filled = items.filter(contentItemFilled);
  if (filled.length === 0) {
    return false;
  }
  return !filled.every((item) => item.kind === "text" && docIsOnlyTable(item.doc));
}
