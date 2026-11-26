import type { PartExample, PartExampleBlock } from "@/entities/test/types";
import { instructionHasContent, toInstructionDoc } from "./instructionDoc";
import { newId } from "@/shared/lib/ids";

export function emptyPartExample(): PartExample {
  return { blocks: [] };
}

export function createExampleTextBlock(): PartExampleBlock {
  return { id: newId(), kind: "text", doc: { type: "doc", content: [{ type: "paragraph" }] } };
}

export function createExampleImageBlock(): PartExampleBlock {
  return { id: newId(), kind: "image" };
}

export function createExampleAudioBlock(): PartExampleBlock {
  return { id: newId(), kind: "audio" };
}

export function createExampleChoicesBlock(): PartExampleBlock {
  const a = newId();
  const b = newId();
  return {
    id: newId(),
    kind: "choices",
    options: [
      { id: a, text: "" },
      { id: b, text: "" },
    ],
    correctId: a,
  };
}

function blockFilled(block: PartExampleBlock): boolean {
  if (block.kind === "text") {
    return instructionHasContent(toInstructionDoc(block.doc));
  }
  if (block.kind === "image" || block.kind === "audio") {
    return Boolean(block.mediaId);
  }
  if (block.kind === "choices") {
    return block.options.some((option) => option.text.trim().length > 0);
  }
  return false;
}

export function partExampleFilled(example: PartExample | null | undefined): boolean {
  if (!example?.blocks?.length) {
    return false;
  }
  return example.blocks.some(blockFilled);
}

export function partExampleHasIntro(example: PartExample | null | undefined): boolean {
  return partExampleFilled(example);
}