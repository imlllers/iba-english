import type { OrderingOptions } from "@/entities/question/types";

export type OrderingPresentation = "list" | "slots";

export function orderingPresentation(options: OrderingOptions | undefined): OrderingPresentation {
  if (options?.presentation === "slots" || options?.presentation === "list") {
    return options.presentation;
  }
  const distractors = options?.distractors ?? [];
  const hasDistractors = distractors.some((item) => item.text?.trim() || item.id);
  const hasFrame = Boolean(options?.prefix?.trim() || options?.suffix?.trim());
  return hasDistractors || hasFrame ? "slots" : "list";
}

export function isOrderingSlotsMode(options: OrderingOptions | undefined): boolean {
  return orderingPresentation(options) === "slots";
}

export function isOrderingWords(options: OrderingOptions | undefined): boolean {
  return (options?.joiner ?? " ") === " ";
}
