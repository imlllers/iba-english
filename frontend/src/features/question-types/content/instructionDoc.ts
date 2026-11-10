import type { Doc } from "@/entities/question/types";
import { emptyDoc } from "./contentItems";

export function toInstructionDoc(value: unknown): Doc {
  if (value && typeof value === "object" && (value as Doc).type === "doc") {
    return value as Doc;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as Doc;
        if (parsed?.type === "doc") {
          return parsed;
        }
      } catch {
      }
    }
    if (trimmed) {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
      };
    }
  }
  return emptyDoc();
}

export function instructionHasContent(doc: Doc): boolean {
  return Boolean(doc.content?.some((node) => {
    if (node.type === "paragraph" || node.type === "heading") {
      return Boolean(node.content?.length);
    }
    return node.type !== "paragraph";
  }));
}

export function serializeInstructionDoc(doc: Doc): string {
  return instructionHasContent(doc) ? JSON.stringify(doc) : "";
}
