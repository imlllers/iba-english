import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Item, OrderingOptions } from "@/entities/question/types";
import { moveItem } from "../../content";
import type { PlayerProps } from "../types";
import { isOrderingSlotsMode, isOrderingWords } from "./orderingMode";

const DRAG_THRESHOLD = 5;
const FLIP_MS = 180;

function cardStyle(words: boolean, hole: boolean, minWidth?: string): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: words ? "auto" : "auto minmax(0, 1fr)",
    gap: "var(--mantine-spacing-xs)",
    alignItems: "center",
    boxSizing: "border-box",
    height: words ? 36 : undefined,
    minHeight: words ? 36 : undefined,
    padding: words ? "0 10px" : "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
    border: hole ? "1px dashed var(--mantine-color-gray-5)" : "1px solid var(--mantine-color-gray-3)",
    borderRadius: "var(--mantine-radius-sm)",
    background: hole ? "var(--mantine-color-gray-0)" : "var(--mantine-color-body)",
    minWidth: minWidth ?? (words ? "auto" : 0),
    whiteSpace: words ? "nowrap" : undefined,
    userSelect: "none",
    touchAction: "none",
  };
}

function chipStyle(hole: boolean, minWidth: string): CSSProperties {
  return {
    appearance: "none",
    font: "inherit",
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    height: 36,
    width: hole ? 0 : minWidth,
    minWidth: hole ? 0 : minWidth,
    padding: hole ? 0 : "0 10px",
    border: hole ? "0 solid transparent" : "1px solid var(--mantine-color-gray-3)",
    borderRadius: "var(--mantine-radius-sm)",
    background: hole ? "transparent" : "var(--mantine-color-body)",
    overflow: "hidden",
    opacity: hole ? 0 : 1,
    cursor: "grab",
    whiteSpace: "nowrap",
    userSelect: "none",
    touchAction: "none",
    pointerEvents: hole ? "none" : undefined,
    transition: `width ${FLIP_MS}ms ease, min-width ${FLIP_MS}ms ease, padding ${FLIP_MS}ms ease, opacity ${FLIP_MS}ms ease, border-width ${FLIP_MS}ms ease`,
  };
}

function slotStyle(over: boolean, minWidth: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    width: minWidth,
    minWidth,
    height: 36,
    padding: "0 8px",
    borderBottom: `2px solid ${over ? "var(--mantine-color-iba-6)" : "var(--mantine-color-gray-5)"}`,
    borderRadius: 2,
    background: over ? "var(--mantine-color-gray-0)" : "transparent",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
  };
}

function longestTokenWidth(texts: string[]) {
  const chars = Math.max(4, ...texts.map((text) => [...text].length));
  return `calc(${chars}ch + 20px)`;
}

function readOrder(answer: PlayerProps["answer"], slotCount: number): Array<string | null> {
  const raw = Array.isArray(answer.order) ? (answer.order as Array<string | null>) : [];
  if (raw.length === slotCount) {
    return raw.map((id) => (typeof id === "string" && id ? id : null));
  }
  return Array.from({ length: slotCount }, () => null);
}

function hitClosest(
  x: number,
  y: number,
  selector: string,
  skip?: { attr: string; value: string },
): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    if (!(node instanceof Element)) {
      continue;
    }
    const match = node.closest(selector);
    if (!match) {
      continue;
    }
    if (skip && match.getAttribute(skip.attr) === skip.value) {
      continue;
    }
    return match;
  }
  return null;
}

function trackPointer(
  pointerId: number,
  onMove: (event: PointerEvent) => void,
  onEnd: (event: PointerEvent, dropped: boolean) => void,
) {
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    onMove(event);
  };
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    onEnd(event, event.type === "pointerup");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

function useFlip(ids: string[], enabled: boolean) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());

  const bind = (id: string) => (el: HTMLElement | null) => {
    if (el) {
      nodes.current.set(id, el);
    } else {
      nodes.current.delete(id);
    }
  };

  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    nodes.current.forEach((el, id) => next.set(id, el.getBoundingClientRect()));
    if (enabled) {
      nodes.current.forEach((el, id) => {
        const before = prev.current.get(id);
        const after = next.get(id);
        if (!before || !after) {
          return;
        }
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return;
        }
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: FLIP_MS, easing: "ease" },
        );
      });
    }
    prev.current = next;
  }, [ids.join("|"), enabled]);

  return bind;
}

function DragGhost({
  text,
  x,
  y,
  width,
  height,
  offsetX,
  offsetY,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}) {
  return createPortal(
    <Box
      style={{
        position: "fixed",
        left: x - offsetX,
        top: y - offsetY,
        width,
        height,
        zIndex: 4000,
        pointerEvents: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 10px",
        border: "1px solid var(--mantine-color-gray-4)",
        borderRadius: "var(--mantine-radius-sm)",
        background: "var(--mantine-color-body)",
        boxShadow: "0 8px 24px color-mix(in srgb, var(--mantine-color-dark-9) 18%, transparent)",
        whiteSpace: "nowrap",
        fontWeight: 500,
        fontSize: "var(--type-body, 1rem)",
      }}
    >
      {text}
    </Box>,
    document.body,
  );
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

type Ghost = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

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
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const draftRef = useRef<Item[] | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const pending = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    text: string;
  } | null>(null);
  const ordered = draft ?? fromAnswer;
  const bindFlip = useFlip(ordered.map((item) => item.id), Boolean(dragId));
  const fromAnswerRef = useRef(fromAnswer);
  fromAnswerRef.current = fromAnswer;

  const commit = (next: Item[]) => onAnswer?.({ order: next.map((item) => item.id) });

  const finishDrag = (persist: boolean) => {
    if (persist && draftRef.current) {
      commit(draftRef.current);
    }
    draftRef.current = null;
    dragIdRef.current = null;
    pending.current = null;
    setDraft(null);
    setDragId(null);
    setGhost(null);
  };

  const moveToward = (clientX: number, clientY: number) => {
    const list = draftRef.current;
    const id = dragIdRef.current;
    if (!list || !id) {
      return;
    }
    const from = list.findIndex((item) => item.id === id);
    if (from < 0) {
      return;
    }
    const hit = hitClosest(clientX, clientY, "[data-ordering-item]", {
      attr: "data-ordering-item",
      value: id,
    });
    const hitId = hit?.getAttribute("data-ordering-item");
    const to = hitId ? list.findIndex((item) => item.id === hitId) : from;
    if (to < 0 || to === from) {
      return;
    }
    const next = moveItem(list, from, to);
    draftRef.current = next;
    setDraft(next);
  };

  const onPointerDown = (item: Item, event: ReactPointerEvent<HTMLElement>) => {
    if (readOnly || event.button !== 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pending.current = {
      id: item.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      text: item.text,
    };
    trackPointer(
      event.pointerId,
      (moveEvent) => {
        const start = pending.current;
        if (!start) {
          return;
        }
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (!dragIdRef.current) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
          }
          dragIdRef.current = start.id;
          const list = fromAnswerRef.current;
          draftRef.current = list;
          setDraft(list);
          setDragId(start.id);
        }
        moveEvent.preventDefault();
        setGhost({
          text: start.text,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          width: start.width,
          height: start.height,
          offsetX: start.offsetX,
          offsetY: start.offsetY,
        });
        moveToward(moveEvent.clientX, moveEvent.clientY);
      },
      (_event, dropped) => finishDrag(dropped && Boolean(dragIdRef.current)),
    );
  };

  return (
    <Stack gap="md">
      {ghost ? <DragGhost {...ghost} /> : null}
      <Box
        component="ol"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: words ? "row" : "column",
          flexWrap: words ? "wrap" : undefined,
          alignItems: words ? "center" : undefined,
          gap: "var(--mantine-spacing-xs)",
        }}
      >
        {ordered.map((item, index) => {
          const hole = dragId === item.id;
          return (
            <Box
              key={item.id}
              ref={bindFlip(item.id)}
              component="li"
              data-ordering-item={item.id}
              tabIndex={readOnly ? undefined : 0}
              style={{
                ...cardStyle(words, hole),
                cursor: readOnly ? undefined : hole ? "grabbing" : "grab",
                listStyle: "none",
                color: hole ? "transparent" : undefined,
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
              onPointerDown={(event) => onPointerDown(item, event)}
            >
              {!words ? (
                <Text component="span" fw={700} style={{ fontSize: "var(--type-body, 1rem)", lineHeight: 1.4 }}>
                  {numberById.get(item.id) ?? index + 1}
                </Text>
              ) : null}
              <Text
                component="span"
                fw={500}
                style={{
                  fontSize: "var(--type-body, 1rem)",
                  lineHeight: 1.4,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.text}
              </Text>
            </Box>
          );
        })}
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
  const tokenWidth = longestTokenWidth(bankPool.map((item) => item.text));
  const availableBank = useMemo(
    () => bankPool.filter((item) => !used.has(item.id)),
    [bankPool, slots],
  );
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const [bankDraftIds, setBankDraftIds] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<{ from: "bank" | "slot"; id: string; index?: number } | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const dragRef = useRef<{ from: "bank" | "slot"; id: string; index?: number } | null>(null);
  const overSlotRef = useRef<number | null>(null);
  const bankDraftRef = useRef<string[] | null>(null);
  const pending = useRef<{
    from: "bank" | "slot";
    id: string;
    index?: number;
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    text: string;
  } | null>(null);

  const bankIds = bankDraftIds ?? availableBank.map((item) => item.id);
  const bindFlip = useFlip(bankIds, Boolean(drag));
  const availableBankRef = useRef(availableBank);
  availableBankRef.current = availableBank;

  const commitSlots = (next: Array<string | null>) => onAnswer?.({ order: next });

  const placeInSlot = (slotIndex: number, itemId: string) => {
    const next = [...slots];
    const fromIndex = next.indexOf(itemId);
    if (fromIndex >= 0) {
      next[fromIndex] = null;
    }
    next[slotIndex] = itemId;
    commitSlots(next);
  };

  const clearSlot = (slotIndex: number) => {
    const next = [...slots];
    next[slotIndex] = null;
    commitSlots(next);
  };

  const finishDrag = (dropped: boolean, x: number, y: number) => {
    const current = dragRef.current;
    if (dropped && current) {
      const slotHit = hitClosest(x, y, "[data-ordering-slot]");
      const slotIndex = slotHit ? Number(slotHit.getAttribute("data-ordering-slot")) : NaN;
      if (Number.isInteger(slotIndex)) {
        placeInSlot(slotIndex, current.id);
      } else if (current.from === "slot") {
        const overBank = hitClosest(x, y, "[data-ordering-bank]")
          || hitClosest(x, y, "[data-ordering-bank-tray]");
        if (overBank) {
          const index = current.index ?? slots.indexOf(current.id);
          if (index >= 0) {
            clearSlot(index);
          }
        }
      }
    }
    dragRef.current = null;
    overSlotRef.current = null;
    bankDraftRef.current = null;
    pending.current = null;
    setDrag(null);
    setGhost(null);
    setOverSlot(null);
    setBankDraftIds(null);
  };

  const startPending = (
    event: ReactPointerEvent<HTMLElement>,
    payload: { from: "bank" | "slot"; id: string; index?: number; text: string },
  ) => {
    if (readOnly || event.button !== 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pending.current = {
      ...payload,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    trackPointer(
      event.pointerId,
      (moveEvent) => {
        const start = pending.current;
        if (!start) {
          return;
        }
        if (!dragRef.current) {
          const dx = moveEvent.clientX - start.x;
          const dy = moveEvent.clientY - start.y;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
          }
          dragRef.current = { from: start.from, id: start.id, index: start.index };
          if (start.from === "bank") {
            const ids = availableBankRef.current.map((item) => item.id);
            bankDraftRef.current = ids;
            setBankDraftIds(ids);
          }
          setDrag(dragRef.current);
        }
        moveEvent.preventDefault();
        setGhost({
          text: start.text,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          width: start.width,
          height: start.height,
          offsetX: start.offsetX,
          offsetY: start.offsetY,
        });
        const slotHit = hitClosest(moveEvent.clientX, moveEvent.clientY, "[data-ordering-slot]");
        const slotIndex = slotHit ? Number(slotHit.getAttribute("data-ordering-slot")) : NaN;
        const nextOver = Number.isInteger(slotIndex) ? slotIndex : null;
        overSlotRef.current = nextOver;
        setOverSlot(nextOver);
        if (dragRef.current?.from === "bank") {
          const bankHit = hitClosest(moveEvent.clientX, moveEvent.clientY, "[data-ordering-bank]", {
            attr: "data-ordering-bank",
            value: dragRef.current.id,
          });
          const hitId = bankHit?.getAttribute("data-ordering-bank");
          const list = bankDraftRef.current ?? availableBankRef.current.map((item) => item.id);
          const from = list.indexOf(dragRef.current.id);
          const to = hitId ? list.indexOf(hitId) : from;
          if (from >= 0 && to >= 0 && from !== to) {
            const next = moveItem(list, from, to);
            bankDraftRef.current = next;
            setBankDraftIds(next);
          }
        }
      },
      (endEvent, dropped) => {
        const wasDrag = Boolean(dragRef.current);
        finishDrag(dropped && wasDrag, endEvent.clientX, endEvent.clientY);
      },
    );
  };

  return (
    <Stack gap="md">
      {ghost ? <DragGhost {...ghost} /> : null}
      <Box
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: "var(--mantine-spacing-md)",
          rowGap: "var(--mantine-spacing-sm)",
          fontSize: "var(--type-body, 1rem)",
          lineHeight: "36px",
        }}
      >
        {prefix ? <Text component="span" fw={500}>{prefix}</Text> : null}
        {slots.map((id, index) => {
          const item = id ? byId.get(id) : undefined;
          const draggingHere = drag?.from === "slot" && drag.index === index;
          return (
            <Box
              key={`slot-${index}`}
              component="span"
              data-ordering-slot={index}
              style={slotStyle(overSlot === index, tokenWidth)}
              aria-label={item ? `Slot ${index + 1}: ${item.text}` : `Slot ${index + 1}, empty`}
            >
              {item ? (
                <UnstyledButton
                  disabled={readOnly}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                    cursor: readOnly ? "default" : draggingHere ? "grabbing" : "grab",
                    opacity: draggingHere ? 0 : 1,
                    color: draggingHere ? "transparent" : undefined,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onPointerDown={(event) => startPending(event, {
                    from: "slot",
                    id: item.id,
                    index,
                    text: item.text,
                  })}
                >
                  <Text fw={500} component="span" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.text}
                  </Text>
                </UnstyledButton>
              ) : (
                <Text c="dimmed" component="span" style={{ userSelect: "none" }} aria-hidden>
                  {"\u00a0"}
                </Text>
              )}
            </Box>
          );
        })}
        {suffix ? <Text component="span" fw={500}>{suffix}</Text> : null}
      </Box>

      <Group gap="sm" wrap="wrap" aria-label="Word bank" data-ordering-bank-tray="">
        {bankIds.map((id) => {
          const item = byId.get(id);
          if (!item) {
            return null;
          }
          const hole = drag?.from === "bank" && drag.id === item.id;
          return (
            <Box
              key={item.id}
              ref={bindFlip(item.id)}
              data-ordering-bank={item.id}
              component="span"
              style={{
                ...chipStyle(hole, tokenWidth),
                cursor: readOnly ? "default" : hole ? "grabbing" : "grab",
                pointerEvents: readOnly ? "none" : undefined,
              }}
              aria-label={readOnly ? item.text : `Drag “${item.text}”`}
              onPointerDown={
                readOnly
                  ? undefined
                  : (event) => startPending(event, { from: "bank", id: item.id, text: item.text })
              }
            >
              <Text fw={500} component="span">{item.text}</Text>
            </Box>
          );
        })}
      </Group>
    </Stack>
  );
}
