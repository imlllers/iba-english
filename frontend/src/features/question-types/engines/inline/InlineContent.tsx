import { Box, Group, Radio, Stack, TextInput } from "@mantine/core";
import { useRef, type KeyboardEvent } from "react";
import type { BlankKind, InlineOptions, Item, TextRule } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { blankKinds } from "../../content";
import { AcceptedAnswersField } from "../../widgets/AcceptedAnswersField";
import { ItemListEditor } from "../../widgets/ItemListEditor";
import type { EditorProps } from "../types";

export const BLANK_LABELS: Record<BlankKind, string> = {
  gap: "Пропуск",
  tail: "Дописать слово",
  dropdown: "Выпадающий список",
};

function focusAnswerField(root: HTMLElement, id: string, place: "start" | "end") {
  const wrap = root.querySelector(`[data-blank-answer="${CSS.escape(id)}"]`);
  if (!(wrap instanceof HTMLElement)) {
    return;
  }
  const field = wrap.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input:not([type='hidden'])");
  if (!field) {
    return;
  }
  field.focus();
  const pos = place === "start" ? 0 : field.value.length;
  try {
    field.setSelectionRange(pos, pos);
  } catch {
  }
}

export function InlineContent({ question, update, startNumber = 1 }: EditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blanks = blankKinds(question.promptContent);
  const options = question.options as InlineOptions;
  const choices = options.choices ?? {};
  const prefixes = options.prefixes ?? {};
  const key = (question.answerKey.blanks as Record<string, TextRule | string>) ?? {};
  const order = blanks.map((item) => item.id);

  if (blanks.length === 0) {
    return (
      <SettingsHint>
        Вставьте в текст вопроса пропуски кнопками на панели: «+ Пропуск», «+ Дописать слово», «+ Выпадающий список»
      </SettingsHint>
    );
  }

  const setKey = (id: string, value: TextRule | string) => update({ answerKey: { blanks: { ...key, [id]: value } } });

  const setChoices = (id: string, items: Item[]) => {
    const current = key[id];
    const next = { ...key };
    if (typeof current !== "string" || !items.some((item) => item.id === current)) {
      if (items[0]) {
        next[id] = items[0].id;
      } else {
        delete next[id];
      }
    }
    update({ options: { ...options, choices: { ...choices, [id]: items } }, answerKey: { blanks: next } });
  };

  const moveBlank = (id: string, direction: -1 | 1) => {
    const index = order.indexOf(id);
    if (index < 0) {
      return;
    }
    const next = order[index + direction];
    const root = rootRef.current;
    if (!next || !root) {
      return;
    }
    focusAnswerField(root, next, direction > 0 ? "start" : "end");
  };

  const onFieldKeyDown = (id: string, event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const field = event.currentTarget;
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    if (start !== end) {
      return;
    }
    if ((event.key === "ArrowRight" || event.key === "ArrowDown") && end === field.value.length) {
      if (order.indexOf(id) >= order.length - 1) {
        return;
      }
      event.preventDefault();
      moveBlank(id, 1);
      return;
    }
    if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && start === 0) {
      if (order.indexOf(id) <= 0) {
        return;
      }
      event.preventDefault();
      moveBlank(id, -1);
    }
  };

  return (
    <Stack gap="md" ref={rootRef}>
      {blanks.map(({ id, kind }, index) => {
        const title = `${startNumber + index}. ${BLANK_LABELS[kind]}`;
        if (kind === "dropdown") {
          return (
            <Box key={id} data-blank-answer={id}>
              <ItemListEditor
                label={title}
                items={choices[id] ?? []}
                min={2}
                marker="none"
                addLabel="Добавить вариант"
                placeholder="Введите вариант"
                onChange={(items) => setChoices(id, items)}
                aside={(item) => (
                  <Radio
                    aria-label="Верный вариант"
                    title="Верный вариант"
                    name={`inline-correct-${id}`}
                    checked={key[id] === item.id}
                    onChange={() => setKey(id, item.id)}
                  />
                )}
              />
            </Box>
          );
        }
        const rule = typeof key[id] === "object" ? (key[id] as TextRule) : undefined;
        if (kind === "tail") {
          return (
            <Group key={id} gap="md" align="flex-start" grow wrap="nowrap" data-blank-answer={id}>
              <TextInput
                label={`${title}: начало слова`}
                withAsterisk
                value={prefixes[id] ?? ""}
                maxLength={100}
                placeholder="Например, beauti"
                style={{ flex: 1, minWidth: 0 }}
                onChange={(event) => update({ options: { ...options, prefixes: { ...prefixes, [id]: event.currentTarget.value } } })}
                onKeyDown={(event) => onFieldKeyDown(id, event)}
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <AcceptedAnswersField
                  key={`${question.id}-${id}`}
                  label="Окончание – допустимые варианты"
                  rule={rule}
                  onChange={(next) => setKey(id, next)}
                  onKeyDown={(event) => onFieldKeyDown(id, event)}
                />
              </Box>
            </Group>
          );
        }
        return (
          <Box key={id} data-blank-answer={id}>
            <AcceptedAnswersField
              label={`${title}: допустимые ответы`}
              rule={rule}
              onChange={(next) => setKey(id, next)}
              onKeyDown={(event) => onFieldKeyDown(id, event)}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
