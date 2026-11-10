import type { ContentItem, PublicQuestion } from "@/entities/question/types";
import { blockItems, questionItems } from "@/features/question-types/content/contentItems";
import type { RunnerPage } from "./runnerPages";

export type GateAudio = {
  key: string;
  mediaId: string;
  scope: "block" | "question";
  questionId?: string;
};

function audioItems(items: ContentItem[]) {
  return items.filter((item) => item.kind === "audio" && item.mediaId);
}

export function pageGateAudios(page: RunnerPage): GateAudio[] {
  const queue: GateAudio[] = [];
  const seenBlocks = new Set<string>();
  const blocks = page.block
    ? [page.block]
    : page.questions
      .map((question) => {
        const id = question.materialBlockId;
        if (!id || seenBlocks.has(id)) {
          return null;
        }
        seenBlocks.add(id);
        return page.section.materialBlocks?.find((block) => block.id === id) ?? null;
      })
      .filter((block): block is NonNullable<typeof block> => Boolean(block));

  for (const block of blocks) {
    for (const item of audioItems(blockItems(block))) {
      queue.push({ key: `block:${item.id}`, mediaId: item.mediaId!, scope: "block" });
    }
  }
  for (const question of page.questions) {
    for (const item of audioItems(questionItems(question))) {
      queue.push({
        key: `question:${question.id}:${item.id}`,
        mediaId: item.mediaId!,
        scope: "question",
        questionId: question.id,
      });
    }
  }
  return queue;
}

export function blockGateKeys(queue: GateAudio[]) {
  return queue.filter((item) => item.scope === "block").map((item) => item.key);
}

export function questionGateKeys(queue: GateAudio[], questionId: string) {
  return queue.filter((item) => item.questionId === questionId).map((item) => item.key);
}

export function isGateReady(done: ReadonlySet<string>, keys: string[]) {
  return keys.every((key) => done.has(key));
}

export function questionAudioReady(queue: GateAudio[], done: ReadonlySet<string>, question: PublicQuestion) {
  return isGateReady(done, blockGateKeys(queue)) && isGateReady(done, questionGateKeys(queue, question.id));
}

export function activeGateKey(queue: GateAudio[], done: ReadonlySet<string>) {
  return queue.find((item) => !done.has(item.key))?.key ?? null;
}
