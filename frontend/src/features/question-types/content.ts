import type { BlankKind, Doc, DocNode, Item, PublicQuestion, Question, SegmentUnit, TextRule } from "@/entities/question/types";

export function blankIds(doc: Doc | undefined) {
  const ids: string[] = [];
  const walk = (node: DocNode) => {
    if (node.type === "blank" && typeof node.attrs?.id === "string" && node.attrs.id && !ids.includes(node.attrs.id)) {
      ids.push(node.attrs.id);
    }
    node.content?.forEach(walk);
  };
  doc?.content?.forEach(walk);
  return ids;
}

export function blankKinds(doc: Doc | undefined) {
  const result: { id: string; kind: BlankKind }[] = [];
  const walk = (node: DocNode) => {
    const id = node.attrs?.id;
    if (node.type === "blank" && typeof id === "string" && id && !result.some((item) => item.id === id)) {
      const kind = node.attrs?.kind;
      result.push({ id, kind: kind === "tail" || kind === "dropdown" ? kind : "gap" });
    }
    node.content?.forEach(walk);
  };
  doc?.content?.forEach(walk);
  return result;
}

export function docPlainText(doc: Doc | undefined): string {
  const inline = (node: DocNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    return (node.content ?? []).map(inline).join("");
  };
  const blocks: string[] = [];
  for (const node of doc?.content ?? []) {
    if (node.type === "bulletList" || node.type === "orderedList") {
      for (const item of node.content ?? []) {
        blocks.push(inline(item));
      }
      continue;
    }
    if (node.type === "table") {
      for (const row of node.content ?? []) {
        blocks.push((row.content ?? []).map(inline).join("\t"));
      }
      continue;
    }
    if (node.type === "horizontalRule") continue;
    blocks.push(inline(node));
  }
  return blocks.join("\n");
}

export function plainToDoc(text: string): Doc {
  const lines = text.split("\n");
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}

export function splitSegments(text: string, unit: SegmentUnit): Item[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const parts = unit === "SENTENCE" ? trimmed.split(/(?<=[.!?])\s+/) : trimmed.split(/\s+/);
  return parts.filter((part) => part.trim() !== "").map((part, index) => ({ id: `s${index}`, text: part }));
}

export function groupSegments(segments: Item[], text: string): Item[][] {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    const groups: Item[][] = [];
    let index = 0;
    for (const line of lines) {
      const count = line.split(/\s+/).filter(Boolean).length;
      groups.push(segments.slice(index, index + count));
      index += count;
    }
    if (index < segments.length) {
      groups.push(segments.slice(index));
    }
    return groups.filter((group) => group.length > 0);
  }
  const groups: Item[][] = [];
  let current: Item[] = [];
  for (const segment of segments) {
    current.push(segment);
    if (/[.!?]$/.test(segment.text)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) {
    groups.push(current);
  }
  return groups.length ? groups : [segments];
}

export function ruleLines(rule: TextRule | undefined) {
  return (rule?.accepted ?? []).join("\n");
}

export function linesRule(lines: string, previous?: TextRule): TextRule {
  return {
    caseInsensitive: previous?.caseInsensitive ?? true,
    normalizeSpaces: previous?.normalizeSpaces ?? true,
    accepted: lines.split("\n").map((line) => line.trim()).filter(Boolean),
  };
}

export function emptyRule(): TextRule {
  return { accepted: [], caseInsensitive: true, normalizeSpaces: true };
}

export function moveItem<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length || from === to) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function short(text: string, length = 48) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

export function publicView(question: Question): PublicQuestion {
  const { answerKey, ...rest } = question;
  const tails = blankKinds(question.promptContent).filter((blank) => blank.kind === "tail");
  if (tails.length === 0 || !rest.options || typeof rest.options !== "object") {
    return rest;
  }
  const keys = (answerKey?.blanks ?? {}) as Record<string, TextRule | string>;
  const tailLengths: Record<string, number> = {};
  for (const { id } of tails) {
    const rule = keys[id];
    const first = typeof rule === "object" ? rule.accepted?.map((value) => value.trim()).find(Boolean) : undefined;
    if (first) tailLengths[id] = [...first].length;
  }
  return { ...rest, options: { ...(rest.options as object), tailLengths } };
}
