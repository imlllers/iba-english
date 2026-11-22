import type { ContentItem, PublicQuestion } from "@/entities/question/types";
import type { MaterialBlock } from "@/entities/test/types";
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

function resolveMaterialBlock(page: RunnerPage, blockId: string): MaterialBlock | null {
  if (page.block?.id === blockId) {
    return page.block;
  }
  return page.section.materialBlocks?.find((item) => item.id === blockId) ?? null;
}

export function groupBlockAudioReady(page: RunnerPage, blockId: string, done: ReadonlySet<string>) {
  const block = resolveMaterialBlock(page, blockId);
  if (!block) {
    return true;
  }
  const queue = pageGateAudios({ ...page, block, questions: [] });
  return isGateReady(done, blockGateKeys(queue));
}

export function speakingPromptCanStart(
  page: RunnerPage,
  question: PublicQuestion,
  done: ReadonlySet<string>,
  readingDone: ReadonlySet<string>,
  demoMode = false,
) {
  const seconds = question.settings.readingSeconds;
  if (!demoMode && typeof seconds === "number" && seconds > 0 && !readingDone.has(question.id)) {
    return false;
  }
  const blockId = question.materialBlockId ?? page.block?.id ?? null;
  if (blockId && !groupBlockAudioReady(page, blockId, done)) {
    return false;
  }
  return true;
}

export function questionTimerReady(
  page: RunnerPage & { groupContent?: boolean },
  queue: GateAudio[],
  done: ReadonlySet<string>,
  question: PublicQuestion,
) {
  if (page.groupContent) {
    return false;
  }
  const blockId = question.materialBlockId ?? page.block?.id ?? null;
  if (blockId && !groupBlockAudioReady(page, blockId, done)) {
    return false;
  }
  return questionAudioReady(queue, done, question);
}

export function activeGateKey(queue: GateAudio[], done: ReadonlySet<string>) {
  return queue.find((item) => !done.has(item.key))?.key ?? null;
}
