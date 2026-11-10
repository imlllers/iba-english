import type { ContentItem, ContentKind, Doc, Question, QuestionSettings } from "@/entities/question/types";
import type { MaterialBlock } from "@/entities/test/types";
import { newId } from "@/shared/lib/ids";

export const CONTENT_LABELS: Record<ContentKind, string> = {
  text: "Текст",
  audio: "Аудио",
  video: "Видео",
  image: "Изображение",
};

export const emptyDoc = (): Doc => ({ type: "doc", content: [{ type: "paragraph" }] });

export function createItem(kind: ContentKind): ContentItem {
  return kind === "text" ? { id: newId(), kind, doc: emptyDoc() } : { id: newId(), kind };
}

function hasText(doc?: Doc) {
  return Boolean(doc?.content?.some((node) => {
    if (node.type === "paragraph" || node.type === "heading") {
      return Boolean(node.content?.length);
    }
    return true;
  }));
}

export function contentItemFilled(item: ContentItem): boolean {
  if (item.kind === "text") {
    return hasText(item.doc);
  }
  return Boolean(item.mediaId);
}

export function blockItems(block: MaterialBlock): ContentItem[] {
  if (block.items?.length) {
    return block.items;
  }
  const items: ContentItem[] = [];
  if (block.mediaId) {
    items.push({ id: `${block.id}-media`, kind: block.mediaKind === "audio" ? "audio" : "image", mediaId: block.mediaId });
  }
  items.push({ id: `${block.id}-text`, kind: "text", doc: block.content });
  return items;
}

export function scopeItems(scope: { id: string; items?: ContentItem[] }): ContentItem[] {
  return scope.items?.length ? scope.items : [];
}

type QuestionContent = Pick<Question, "id" | "promptContent" | "settings">;

export function questionItems(question: QuestionContent): ContentItem[] {
  const stored = question.settings.content;
  if (!stored) {
    const items: ContentItem[] = [];
    if (question.settings.mediaId) {
      items.push({ id: `${question.id}-media`, kind: question.settings.mediaKind === "image" ? "image" : "audio", mediaId: question.settings.mediaId });
    }
    if (hasText(question.promptContent) || items.length === 0) {
      items.push({ id: `${question.id}-text`, kind: "text", doc: question.promptContent });
    }
    return items;
  }
  let promptPlaced = false;
  return stored.map((item) => {
    if (item.kind === "text" && !promptPlaced) {
      promptPlaced = true;
      return { ...item, doc: question.promptContent };
    }
    return item;
  });
}

export function promptItemId(items: ContentItem[]) {
  return items.find((item) => item.kind === "text")?.id;
}

export function questionPatch(items: ContentItem[], settings: QuestionSettings): Pick<Question, "promptContent" | "settings"> {
  const promptId = promptItemId(items);
  const prompt = items.find((item) => item.id === promptId);
  const media = items.find((item) => (item.kind === "audio" || item.kind === "image") && item.mediaId);
  const next: QuestionSettings = {
    ...settings,
    content: items.map((item) => (item.id === promptId ? { id: item.id, kind: item.kind } : item)),
  };
  if (media) {
    next.mediaId = media.mediaId;
    next.mediaKind = media.kind === "image" ? "image" : "audio";
  } else {
    delete next.mediaId;
    delete next.mediaKind;
  }
  return { promptContent: prompt?.doc ?? emptyDoc(), settings: next };
}
