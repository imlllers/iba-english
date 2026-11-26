import type { InlineOptions, Item } from "@/entities/question/types";

export const SHARED_DROPDOWN_CHOICES_KEY = "__shared__";

export function inlineDropdownChoiceItems(options: InlineOptions, blankId: string): Item[] {
  if (options.sharedDropdownChoices) {
    return options.choices?.[SHARED_DROPDOWN_CHOICES_KEY] ?? [];
  }
  return options.choices?.[blankId] ?? [];
}