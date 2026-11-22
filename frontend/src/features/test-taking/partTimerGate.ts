import type { PublicQuestion } from "@/entities/question/types";
import type { RunnerPage } from "./runnerPages";
import type { GateAudio } from "./pageAudioGate";
import { activeGateKey, questionTimerReady } from "./pageAudioGate";
import { pageReadingPending } from "./readingPhase";

export function partTimerReady(
  page: RunnerPage & { groupContent?: boolean },
  queue: GateAudio[],
  done: ReadonlySet<string>,
  readingDone: ReadonlySet<string>,
) {
  if (page.groupContent) {
    return activeGateKey(queue, done) === null;
  }
  if (pageReadingPending(page.questions, readingDone)) {
    return false;
  }
  if (activeGateKey(queue, done) !== null) {
    return false;
  }
  return page.questions.every((question) => questionTimerReady(page, queue, done, question));
}

export function pageInteractionReady(
  page: RunnerPage & { groupContent?: boolean },
  queue: GateAudio[],
  done: ReadonlySet<string>,
  readingDone: ReadonlySet<string>,
  question: PublicQuestion,
) {
  const seconds = question.settings.readingSeconds;
  if (typeof seconds === "number" && seconds > 0 && !readingDone.has(question.id)) {
    return false;
  }
  return questionTimerReady(page, queue, done, question);
}