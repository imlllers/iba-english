import { SimpleGrid, Stack, TextInput } from "@mantine/core";
import type { Item, MatchingOptions } from "@/entities/question/types";
import { newId } from "@/shared/lib/ids";
import { letter } from "@/shared/lib/format";
import { Select } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { ItemListEditor } from "../../widgets/ItemListEditor";
import type { EditorProps } from "../types";

export function MatchingContent({ question, update, startNumber = 1 }: EditorProps) {
  const options = question.options as MatchingOptions;
  const pairs = (question.answerKey.pairs as Record<string, string>) ?? {};
  const set = (patch: Partial<MatchingOptions>) => update({ options: { ...options, ...patch } });

  const setLeft = (left: Item[]) => {
    const next = { ...pairs };
    Object.keys(next).filter((id) => !left.some((item) => item.id === id)).forEach((id) => delete next[id]);
    update({ options: { ...options, left }, answerKey: { pairs: next } });
  };

  const setRight = (right: Item[]) => {
    const ids = new Set(right.map((item) => item.id));
    const next = { ...pairs };
    for (const [leftId, rightId] of Object.entries(next)) {
      if (rightId && !ids.has(rightId)) delete next[leftId];
    }
    update({ options: { ...options, right }, answerKey: { pairs: next } });
  };

  return (
    <Stack gap="md">
      <Switch
        checked={Boolean(options.allowReuse)}
        onChange={(allowReuse) => set({ allowReuse })}
        label="Один вариант можно выбрать для нескольких элементов"
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack gap="sm">
          <TextInput
            label="Заголовок левой колонки"
            placeholder="Введите заголовок"
            value={options.leftTitle ?? ""}
            onChange={(event) => set({ leftTitle: event.currentTarget.value })}
          />
          <ItemListEditor
            label="Элементы"
            items={options.left ?? []}
            marker="number"
            startNumber={startNumber}
            addLabel="Добавить элемент"
            create={() => ({ id: newId(), text: "" })}
            onChange={setLeft}
            extra={(item) => (
              <Select
                size="sm"
                label="Верный вариант"
                withAsterisk
                value={pairs[item.id] ?? ""}
                onChange={(next) => update({ answerKey: { pairs: { ...pairs, [item.id]: next } } })}
                options={[
                  { value: "", label: "Верный вариант" },
                  ...(options.right ?? []).map((choice, choiceIndex) => ({
                    value: choice.id,
                    label: choice.text.trim() || letter(choiceIndex),
                    disabled: !options.allowReuse && Object.entries(pairs).some(([otherLeft, rightId]) => otherLeft !== item.id && rightId === choice.id),
                  })),
                ]}
              />
            )}
          />
        </Stack>
        <Stack gap="sm">
          <TextInput
            label="Заголовок правой колонки"
            placeholder="Введите заголовок"
            value={options.rightTitle ?? ""}
            onChange={(event) => set({ rightTitle: event.currentTarget.value })}
          />
          <ItemListEditor
            label="Варианты для выбора"
            items={options.right ?? []}
            marker="letter"
            addLabel="Добавить вариант"
            onChange={setRight}
          />
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
