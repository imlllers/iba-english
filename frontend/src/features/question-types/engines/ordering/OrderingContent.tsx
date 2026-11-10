import { Stack, TextInput } from "@mantine/core";
import type { OrderingOptions } from "@/entities/question/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { ItemListEditor } from "../../widgets/ItemListEditor";
import { SegmentedChoice } from "../../widgets/SegmentedChoice";
import type { EditorProps } from "../types";
import { isOrderingWords, orderingPresentation, type OrderingPresentation } from "./orderingMode";

export function OrderingContent({ question, update }: EditorProps) {
  const options = question.options as OrderingOptions;
  const presentation = orderingPresentation(options);
  const words = isOrderingWords(options);
  const slots = presentation === "slots";

  const patch = (next: Partial<OrderingOptions>) => {
    const merged = { ...options, ...next };
    update({
      options: merged,
      answerKey: { order: (merged.items ?? []).map((item) => item.id) },
    });
  };

  const setPresentation = (value: OrderingPresentation) => {
    patch({ presentation: value });
  };

  return (
    <Stack gap="md">
      <SegmentedChoice
        label="Формат ответа"
        value={presentation}
        options={[
          { value: "list", label: "Список" },
          { value: "slots", label: "Банк и слоты" },
        ]}
        onChange={(value) => setPresentation(value as OrderingPresentation)}
      />
      <SettingsHint>
        {slots
          ? "Участник перетаскивает элементы из банка в пропуски. Список ниже – правильный порядок; лишние и текст до/после – по желанию"
          : "Участник меняет порядок элементов. Список ниже – правильный ответ"}
      </SettingsHint>

      <SegmentedChoice
        label="Вид элементов"
        value={words ? "words" : "parts"}
        options={[
          { value: "words", label: "Слова" },
          { value: "parts", label: "Части текста" },
        ]}
        onChange={(value) => patch({ joiner: value === "words" ? " " : "\n" })}
      />

      <ItemListEditor
        label={words ? "Слова в правильном порядке" : "Части в правильном порядке"}
        items={options.items ?? []}
        min={0}
        marker="number"
        multiline={!words}
        addLabel={words ? "Добавить слово" : "Добавить часть"}
        onChange={(items) => patch({ items })}
      />

      {slots ? (
        <>
          <ItemListEditor
            label={words ? "Лишние слова в банке" : "Лишние части в банке"}
            items={options.distractors ?? []}
            min={0}
            marker="none"
            multiline={!words}
            addLabel={words ? "Добавить лишнее слово" : "Добавить лишнюю часть"}
            onChange={(distractors) => patch({ distractors })}
          />
          <TextInput
            label="Текст до слотов"
            description="Необязательно. Например: The"
            value={options.prefix ?? ""}
            onChange={(event) => patch({ prefix: event.currentTarget.value })}
          />
          <TextInput
            label="Текст после слотов"
            description="Необязательно. Например: fantastic"
            value={options.suffix ?? ""}
            onChange={(event) => patch({ suffix: event.currentTarget.value })}
          />
        </>
      ) : null}
    </Stack>
  );
}
