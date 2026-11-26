import { Box, Group, Input, Radio, Stack, TextInput } from "@mantine/core";
import { useRef, type KeyboardEvent } from "react";
import type { BlankKind, InlineOptions, Item, TextRule } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { blankKinds } from "../../content";
import { AcceptedAnswersField } from "../../widgets/AcceptedAnswersField";
import { ItemListEditor } from "../../widgets/ItemListEditor";
import { SegmentedChoice } from "../../widgets/SegmentedChoice";
import type { EditorProps } from "../types";
import { SHARED_DROPDOWN_CHOICES_KEY } from "./sharedDropdownChoices";

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
  const dropdownBlanks = blanks.filter((item) => item.kind === "dropdown");
  const multiDropdown = dropdownBlanks.length >= 2;
  const sharedDropdown = multiDropdown && Boolean(options.sharedDropdownChoices);
  const sharedItems = choices[SHARED_DROPDOWN_CHOICES_KEY] ?? [];
  const sharedItemsFilled = sharedItems.filter((item) => item.text.trim().length > 0);

  if (blanks.length === 0) {
    return (
      <SettingsHint>
        Вставьте в текст вопроса пропуски кнопками на панели: «+ Пропуск», «+ Дописать слово», «+ Выпадающий список»
      </SettingsHint>
    );
  }

  const setKey = (id: string, value: TextRule | string) => update({ answerKey: { blanks: { ...key, [id]: value } } });

  const syncKeyWithItems = (items: Item[], ids: string[]) => {
    const next = { ...key };
    for (const id of ids) {
      const current = key[id];
      if (typeof current !== "string" || !items.some((item) => item.id === current)) {
        if (items[0]) {
          next[id] = items[0].id;
        } else {
          delete next[id];
        }
      }
    }
    return next;
  };

  const setChoices = (id: string, items: Item[]) => {
    update({
      options: { ...options, choices: { ...choices, [id]: items } },
      answerKey: { blanks: syncKeyWithItems(items, [id]) },
    });
  };

  const setSharedChoices = (items: Item[]) => {
    const ids = dropdownBlanks.map((item) => item.id);
    update({
      options: {
        ...options,
        sharedDropdownChoices: true,
        choices: { ...choices, [SHARED_DROPDOWN_CHOICES_KEY]: items },
      },
      answerKey: { blanks: syncKeyWithItems(items, ids) },
    });
  };

  const setSharedMode = (shared: boolean) => {
    const dropdownIds = dropdownBlanks.map((item) => item.id);
    if (!shared) {
      const items = sharedItems.length ? sharedItems : [];
      const nextChoices = { ...choices };
      delete nextChoices[SHARED_DROPDOWN_CHOICES_KEY];
      for (const id of dropdownIds) {
        if (!nextChoices[id]?.length && items.length) {
          nextChoices[id] = items;
        }
      }
      update({ options: { ...options, sharedDropdownChoices: false, choices: nextChoices } });
      return;
    }
    const firstList = dropdownIds
      .map((id) => choices[id])
      .find((list) => list && list.length >= 2) ?? sharedItems;
    update({
      options: {
        ...options,
        sharedDropdownChoices: true,
        choices: { ...choices, [SHARED_DROPDOWN_CHOICES_KEY]: firstList },
      },
      answerKey: { blanks: syncKeyWithItems(firstList, dropdownIds) },
    });
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
      {multiDropdown ? (
        <SegmentedChoice
          label="Варианты выпадающих списков"
          value={sharedDropdown ? "shared" : "perBlank"}
          options={[
            { value: "perBlank", label: "У каждого пропуска" },
            { value: "shared", label: "Один на всех" },
          ]}
          onChange={(value) => setSharedMode(value === "shared")}
        />
      ) : null}
      {sharedDropdown ? (
        <ItemListEditor
          label="Общий список вариантов"
          items={sharedItems}
          min={2}
          marker="none"
          addLabel="Добавить вариант"
          placeholder="Введите вариант"
          requiredMarker
          onChange={setSharedChoices}
        />
      ) : null}
      {blanks.map(({ id, kind }, index) => {
        const title = `${startNumber + index}. ${BLANK_LABELS[kind]}`;
        if (kind === "dropdown") {
          if (sharedDropdown) {
            if (!sharedItemsFilled.length) {
              return null;
            }
            const correctTitle = `${startNumber + index}. Правильный ответ`;
            return (
              <Stack key={id} gap="xs" component="fieldset" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} data-blank-answer={id}>
                <Input.Label component="legend" style={{ padding: 0 }}>
                  {correctTitle}
                  <span aria-hidden style={{ color: "var(--mantine-color-error)", marginInlineStart: 4 }}>
                    *
                  </span>
                </Input.Label>
                <Stack gap="xs">
                  {sharedItemsFilled.map((item) => (
                    <Radio
                      key={item.id}
                      aria-label="Верный вариант"
                      name={`inline-correct-${id}`}
                      label={item.text}
                      checked={key[id] === item.id}
                      onChange={() => setKey(id, item.id)}
                    />
                  ))}
                </Stack>
              </Stack>
            );
          }
          return (
            <Box key={id} data-blank-answer={id}>
              <ItemListEditor
                label={title}
                items={choices[id] ?? []}
                min={2}
                marker="none"
                addLabel="Добавить вариант"
                placeholder="Введите вариант"
                requiredMarker
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