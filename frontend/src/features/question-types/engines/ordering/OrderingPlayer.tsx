import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { Item, OrderingOptions } from "@/entities/question/types";
import { moveItem } from "../../content";
import type { PlayerProps } from "../types";
import { isOrderingSlotsMode, isOrderingWords } from "./orderingMode";

type DragPayload =
  | { from: "bank"; id: string }
  | { from: "slot"; index: number };

function cardStyle(words: boolean, dragging: boolean, over: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: words ? "auto" : "auto minmax(0, 1fr)",
    gap: "var(--mantine-spacing-xs)",
    alignItems: "center",
    padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
    border: "1px solid var(--mantine-color-gray-3)",
    borderRadius: "var(--mantine-radius-sm)",
    background: over ? "var(--mantine-color-gray-0)" : "var(--mantine-color-body)",
    opacity: dragging ? 0.35 : 1,
    minWidth: 0,
  };
}

function chipStyle(dragging: boolean, over: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    border: "1px solid var(--mantine-color-gray-3)",
    borderRadius: "var(--mantine-radius-sm)",
    background: over ? "var(--mantine-color-gray-0)" : "var(--mantine-color-body)",
    opacity: dragging ? 0.35 : 1,
    cursor: "grab",
    minWidth: 0,
  };
}

function slotStyle(filled: boolean, over: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: filled ? undefined : 72,
    minHeight: 36,
    padding: filled ? "4px 8px" : "4px 12px",
    borderBottom: `2px ${over ? "solid var(--mantine-color-gray-6)" : "dashed var(--mantine-color-gray-5)"}`,
    borderRadius: 2,
    background: over ? "var(--mantine-color-gray-0)" : "transparent",
    verticalAlign: "bottom",
  };
}

function readOrder(answer: PlayerProps["answer"], slotCount: number): Array<string | null> {
  const raw = Array.isArray(answer.order) ? (answer.order as Array<string | null>) : [];
  if (raw.length === slotCount) {
    return raw.map((id) => (typeof id === "string" && id ? id : null));
  }
  return Array.from({ length: slotCount }, () => null);
}

export function OrderingPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const options = question.options as OrderingOptions;
  const items = options.items ?? [];
  const distractors = options.distractors ?? [];
  const words = isOrderingWords(options);
  const slotsMode = isOrderingSlotsMode(options);
  const bankPool = [...items, ...distractors];
  const byId = new Map(bankPool.map((item) => [item.id, item]));

  if (slotsMode) {
    return (
      <SlotsPlayer
        items={items}
        bankPool={bankPool}
        byId={byId}
        prefix={options.prefix?.trim() ?? ""}
        suffix={options.suffix?.trim() ?? ""}
        answer={answer}
        onAnswer={onAnswer}
        readOnly={readOnly}
      />
    );
  }

  return (
    <ListPlayer
      items={items}
      words={words}
      answer={answer}
      onAnswer={onAnswer}
      readOnly={readOnly}
    />
  );
}

function ListPlayer({
  items,
  words,
  answer,
  onAnswer,
  readOnly,
}: {
  items: Item[];
  words: boolean;
  answer: PlayerProps["answer"];
  onAnswer: PlayerProps["onAnswer"];
  readOnly?: boolean;
}) {
  const saved = Array.isArray(answer.order) ? (answer.order as string[]) : [];
  const fromAnswer: Item[] =
    saved.length === items.length
      ? saved.map((id) => items.find((item) => item.id === id)).filter((item): item is Item => Boolean(item))
      : items;
  const numberById = new Map(items.map((item, index) => [item.id, index + 1]));
  const [draft, setDraft] = useState<Item[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const draftRef = useRef<Item[] | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const ordered = draft ?? fromAnswer;

  const commit = (next: Item[]) => onAnswer?.({ order: next.map((item) => item.id) });

  const finishDrag = () => {
    if (draftRef.current) {
      commit(draftRef.current);
    }
    draftRef.current = null;
    dragIdRef.current = null;
    setDraft(null);
    setDragId(null);
  };

  return (
    <Stack gap="md">
      <Box
        component="ol"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: words ? "row" : "column",
          flexWrap: words ? "wrap" : undefined,
          gap: "var(--mantine-spacing-xs)",
        }}
      >
        {ordered.map((item, index) => (
          <Box
            key={item.id}
            component="li"
            draggable={!readOnly}
            tabIndex={readOnly ? undefined : 0}
            style={{
              ...cardStyle(words, dragId === item.id, false),
              cursor: readOnly ? undefined : dragId === item.id ? "grabbing" : "grab",
              listStyle: "none",
            }}
            aria-label={readOnly ? undefined : `Drag or use arrow keys: “${item.text}”`}
            onKeyDown={(event) => {
              if (readOnly) return;
              if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                if (index > 0) commit(moveItem(ordered, index, index - 1));
              } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                if (index < ordered.length - 1) commit(moveItem(ordered, index, index + 1));
              }
            }}
            onDragStart={(event) => {
              if (readOnly) return;
              draftRef.current = fromAnswer;
              dragIdRef.current = item.id;
              setDraft(fromAnswer);
              setDragId(item.id);
              const card = event.currentTarget;
              event.dataTransfer.setDragImage(card, Math.min(24, card.clientWidth / 4), card.clientHeight / 2);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={finishDrag}
            onDragOver={(event) => {
              if (readOnly || !dragIdRef.current) return;
              event.preventDefault();
              const list = draftRef.current ?? ordered;
              const from = list.findIndex((entry) => entry.id === dragIdRef.current);
              if (from < 0 || from === index) return;
              const next = moveItem(list, from, index);
              draftRef.current = next;
              setDraft(next);
            }}
            onDrop={(event) => {
              if (readOnly) return;
              event.preventDefault();
              finishDrag();
            }}
          >
            {!words ? (
              <Text component="span" fw={700} style={{ fontSize: "var(--type-body, 1rem)", lineHeight: 1.4 }}>
                {numberById.get(item.id) ?? index + 1}
              </Text>
            ) : null}
            <Text component="span" fw={500} style={{ fontSize: "var(--type-body, 1rem)", lineHeight: 1.4, minWidth: 0 }}>
              {item.text}
            </Text>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}

function SlotsPlayer({
  items,
  bankPool,
  byId,
  prefix,
  suffix,
  answer,
  onAnswer,
  readOnly,
}: {
  items: Item[];
  bankPool: Item[];
  byId: Map<string, Item>;
  prefix: string;
  suffix: string;
  answer: PlayerProps["answer"];
  onAnswer: PlayerProps["onAnswer"];
  readOnly?: boolean;
}) {
  const slotCount = items.length;
  const slots = readOrder(answer, slotCount);
  const used = new Set(slots.filter((id): id is string => Boolean(id)));
  const bank = bankPool.filter((item) => !used.has(item.id));
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const commitSlots = (next: Array<string | null>) => onAnswer?.({ order: next });

  const placeInSlot = (slotIndex: number, itemId: string) => {
    const next = [...slots];
    const fromIndex = next.indexOf(itemId);
    if (fromIndex >= 0) {
      next[fromIndex] = null;
    }
    const displaced = next[slotIndex];
    next[slotIndex] = itemId;
    if (displaced && displaced !== itemId && fromIndex < 0) {
    }
    commitSlots(next);
  };

  const clearSlot = (slotIndex: number) => {
    const next = [...slots];
    next[slotIndex] = null;
    commitSlots(next);
  };

  const onDropToSlot = (slotIndex: number) => {
    if (!drag) return;
    if (drag.from === "bank" || drag.from === "slot") {
      const id = drag.from === "bank" ? drag.id : slots[drag.index];
      if (id) placeInSlot(slotIndex, id);
    }
    setDrag(null);
    setOverSlot(null);
  };

  return (
    <Stack gap="md">
      <Box
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "8px 10px",
          fontSize: "var(--type-body, 1rem)",
          lineHeight: 1.6,
        }}
      >
        {prefix ? <Text component="span" fw={500}>{prefix}</Text> : null}
        {slots.map((id, index) => {
          const item = id ? byId.get(id) : undefined;
          return (
            <Box
              key={`slot-${index}`}
              component="span"
              style={slotStyle(Boolean(item), overSlot === index)}
              onDragOver={(event) => {
                if (readOnly) return;
                event.preventDefault();
                setOverSlot(index);
              }}
              onDragLeave={() => setOverSlot((current) => (current === index ? null : current))}
              onDrop={(event) => {
                if (readOnly) return;
                event.preventDefault();
                onDropToSlot(index);
              }}
              onClick={() => {
                if (readOnly) return;
                if (selectedBankId) {
                  placeInSlot(index, selectedBankId);
                  setSelectedBankId(null);
                  return;
                }
                if (item) clearSlot(index);
              }}
              aria-label={item ? `Slot ${index + 1}: ${item.text}` : `Slot ${index + 1}, empty`}
            >
              {item ? (
                <UnstyledButton
                  draggable={!readOnly}
                  disabled={readOnly}
                  style={{ ...chipStyle(drag?.from === "slot" && drag.index === index, false), cursor: readOnly ? "default" : "grab" }}
                  onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                    if (readOnly) return;
                    setDrag({ from: "slot", index });
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDrag(null);
                    setOverSlot(null);
                  }}
                >
                  <Text fw={500} component="span">{item.text}</Text>
                </UnstyledButton>
              ) : (
                <Text c="dimmed" component="span" style={{ userSelect: "none" }}>
                  {"\u00a0".repeat(6)}
                </Text>
              )}
            </Box>
          );
        })}
        {suffix ? <Text component="span" fw={500}>{suffix}</Text> : null}
      </Box>

      <Group gap="sm" wrap="wrap" aria-label="Word bank">
        {bank.map((item) => (
          <UnstyledButton
            key={item.id}
            draggable={!readOnly}
            disabled={readOnly}
            style={{
              ...chipStyle(
                drag?.from === "bank" && drag.id === item.id,
                selectedBankId === item.id,
              ),
              cursor: readOnly ? "default" : "grab",
              outline: selectedBankId === item.id ? "2px solid var(--mantine-color-iba-6)" : undefined,
            }}
            aria-label={readOnly ? item.text : `Drag “${item.text}”`}
            onClick={() => {
              if (readOnly) return;
              setSelectedBankId((current) => (current === item.id ? null : item.id));
            }}
            onDragStart={(event) => {
              if (readOnly) return;
              setSelectedBankId(null);
              setDrag({ from: "bank", id: item.id });
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDrag(null);
              setOverSlot(null);
            }}
          >
            <Text fw={500} component="span">{item.text}</Text>
          </UnstyledButton>
        ))}
      </Group>
      {!readOnly && selectedBankId ? (
        <Text size="sm" c="dimmed">
          Choose a slot or drag a word
        </Text>
      ) : null}
    </Stack>
  );
}
