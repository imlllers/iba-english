import { Button, Group, Input, Stack, Text, Textarea, TextInput } from "@mantine/core";
import type { ReactNode } from "react";
import type { Item } from "@/entities/question/types";
import { letter } from "@/shared/lib/format";
import { newId } from "@/shared/lib/ids";
import { Icon } from "@/shared/ui/Icon";
import { IconButton } from "@/shared/ui/IconButton";

type ItemListEditorProps<T extends Item> = {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  addLabel: string;
  min?: number;
  max?: number;
  marker?: "letter" | "number" | "none";
  startNumber?: number;
  multiline?: boolean;
  placeholder?: string;
  create?: () => T;
  extra?: (item: T, index: number) => ReactNode;
  aside?: (item: T, index: number) => ReactNode;
};

export function ItemListEditor<T extends Item>({
  label,
  items,
  onChange,
  addLabel,
  min = 1,
  max,
  marker = "letter",
  startNumber = 1,
  multiline = false,
  placeholder = "Введите текст",
  create,
  extra,
  aside,
}: ItemListEditorProps<T>) {
  const update = (index: number, text: string) => onChange(items.map((item, current) => (current === index ? { ...item, text } : item)));
  const canAdd = max === undefined || items.length < max;
  const add = () => {
    if (!canAdd) return;
    onChange([...items, create ? create() : ({ id: newId(), text: "" } as T)]);
  };
  const stacked = multiline || Boolean(extra);
  const rowControlHeight = "var(--input-height, var(--control-height, 36px))";

  return (
    <Stack gap="sm" component="fieldset" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Input.Label component="legend" style={{ padding: 0 }}>
        {label}
        {min > 0 ? (
          <span aria-hidden style={{ color: "var(--mantine-color-error)", marginInlineStart: 4 }}>
            *
          </span>
        ) : null}
      </Input.Label>
      <Stack gap="sm" component="ol" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item, index) => (
          <Group
            key={item.id}
            component="li"
            align={stacked ? "flex-start" : "center"}
            gap="sm"
            wrap="nowrap"
          >
            {marker !== "none" && (
              <Text
                w={28}
                ta="right"
                style={{
                  flex: "none",
                  fontSize: "var(--type-body, 1rem)",
                  lineHeight: stacked ? rowControlHeight : "inherit",
                  fontWeight: 700,
                }}
              >
                {marker === "letter" ? letter(index) : startNumber + index}
              </Text>
            )}
            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
              {multiline ? (
                <Textarea
                  autosize
                  minRows={1}
                  maxRows={8}
                  value={item.text}
                  placeholder={placeholder}
                  aria-label={`${label}: ${startNumber + index}`}
                  onChange={(event) => update(index, event.currentTarget.value)}
                />
              ) : (
                <TextInput
                  value={item.text}
                  placeholder={placeholder}
                  aria-label={`${label}: ${startNumber + index}`}
                  onChange={(event) => update(index, event.currentTarget.value)}
                />
              )}
              {extra?.(item, index)}
            </Stack>
            <Group
              gap="md"
              wrap="nowrap"
              align="center"
              style={{
                flex: "none",
                ...(stacked ? { minHeight: rowControlHeight } : null),
              }}
            >
              {aside?.(item, index)}
              {max === 1 && min >= 1 ? null : (
                <IconButton
                  color="red"
                  label="Удалить"
                  disabled={items.length <= min}
                  onClick={() => onChange(items.filter((_, current) => current !== index))}
                >
                  <Icon name="trash" />
                </IconButton>
              )}
            </Group>
          </Group>
        ))}
      </Stack>
      {canAdd ? (
        <Button variant="subtle" size="compact-sm" leftSection={<Icon name="plus" />} onClick={add} style={{ alignSelf: "flex-start" }}>
          {addLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
