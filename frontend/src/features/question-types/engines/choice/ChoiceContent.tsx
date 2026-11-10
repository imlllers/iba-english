import { Checkbox, Radio } from "@mantine/core";
import type { Item } from "@/entities/question/types";
import { ieltsMultiSelectSlots } from "../../numbering";
import { ItemListEditor } from "../../widgets/ItemListEditor";
import type { EditorProps } from "../types";

export function ChoiceContent({ question, update, examType = "CUSTOM" }: EditorProps) {
  const options: Item[] = Array.isArray(question.options) ? question.options : [];
  const multiple = question.type === "MULTIPLE_SELECT";
  const ieltsSlots = multiple && ieltsMultiSelectSlots(examType);
  const long = options.some((option) => option.text.length > 80);
  const selected = multiple
    ? ((question.answerKey.correctOptionIds as string[]) ?? [])
    : [String(question.answerKey.correctOptionId ?? "")];

  const syncMulti = (correctOptionIds: string[]) => {
    const selectCount = Math.max(1, correctOptionIds.length);
    update({
      answerKey: { correctOptionIds },
      settings: { ...question.settings, selectCount },
      scoringConfig: ieltsSlots
        ? { ...question.scoringConfig, points: selectCount }
        : question.scoringConfig,
    });
  };

  const setOptions = (items: Item[]) => {
    const ids = new Set(items.map((item) => item.id));
    if (multiple) {
      const correctOptionIds = ((question.answerKey.correctOptionIds as string[]) ?? []).filter((id) => ids.has(id));
      const selectCount = Math.max(1, correctOptionIds.length);
      update({
        options: items,
        answerKey: { correctOptionIds },
        settings: { ...question.settings, selectCount },
        scoringConfig: ieltsSlots
          ? {
              ...question.scoringConfig,
              points: Math.max(1, correctOptionIds.length || Number(question.scoringConfig.points) || 1),
            }
          : question.scoringConfig,
      });
      return;
    }
    const current = typeof question.answerKey.correctOptionId === "string" ? question.answerKey.correctOptionId : "";
    const correctOptionId = ids.has(current) ? current : items[0]?.id;
    update({ options: items, answerKey: correctOptionId ? { correctOptionId } : {} });
  };

  const mark = (id: string, checked: boolean) => {
    if (!multiple) {
      update({ answerKey: { correctOptionId: id } });
      return;
    }
    const next = checked ? [...selected.filter(Boolean), id] : selected.filter((value) => value !== id);
    syncMulti(options.map((option) => option.id).filter((value) => next.includes(value)));
  };

  return (
    <ItemListEditor
      label="Варианты ответа"
      items={options}
      min={2}
      multiline={long}
      addLabel="Добавить вариант"
      placeholder="Введите текст варианта"
      onChange={setOptions}
      aside={(item) =>
        multiple ? (
          <Checkbox
            aria-label="Верный вариант"
            title="Верный вариант"
            checked={selected.includes(item.id)}
            onChange={(event) => mark(item.id, event.currentTarget.checked)}
          />
        ) : (
          <Radio
            aria-label="Отметить как верный"
            title="Отметить как верный"
            name={`correct-${question.id}`}
            checked={selected.includes(item.id)}
            onChange={() => mark(item.id, true)}
          />
        )
      }
    />
  );
}
