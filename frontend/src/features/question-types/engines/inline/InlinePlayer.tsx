import { Box, Stack, TextInput } from "@mantine/core";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Doc, DocNode, InlineOptions } from "@/entities/question/types";
import { Select } from "@/shared/ui/Select";
import { blankKinds, blankIds } from "../../content";
import { formatQuestionNumber } from "../../numbering";
import { PromptView } from "../../prompt/PromptView";
import { gapInputStyles, gapNumberStyle, gapSelectStyles } from "../gapStyles";
import type { PlayerProps } from "../types";

function focusBlankControl(root: HTMLElement, id: string, place: "start" | "end") {
  const wrap = root.querySelector(`[data-gap-blank="${CSS.escape(id)}"]`);
  if (!(wrap instanceof HTMLElement)) {
    return;
  }
  const focusable = wrap.querySelector<HTMLElement>("input:not([type='hidden']), [role='combobox'], select");
  if (!focusable) {
    return;
  }
  focusable.focus();
  if (focusable instanceof HTMLInputElement && focusable.type !== "hidden") {
    const pos = place === "start" ? 0 : focusable.value.length;
    try {
      focusable.setSelectionRange(pos, pos);
    } catch {
    }
  }
}

export function InlinePlayer({
  question,
  answer,
  onAnswer,
  readOnly,
  startNumber = 1,
  numberFormat = "1",
  hideBlankNumbers = false,
}: PlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focusedBlank, setFocusedBlank] = useState<string | null>(null);
  const [carets, setCarets] = useState<Record<string, number>>({});
  const options = question.options as InlineOptions;
  const kinds = new Map(blankKinds(question.promptContent).map((item) => [item.id, item.kind]));
  const order = blankIds(question.promptContent);
  const blanks = (answer.blanks as Record<string, string>) ?? {};
  const set = (id: string, value: string) => onAnswer({ blanks: { ...blanks, [id]: value } });
  const sentenceMode = question.type === "SENTENCE_GAPS";
  const lettersOf = (id: string) => (kinds.get(id) === "tail" ? options.tailLengths?.[id] ?? 0 : 0);
  const cellsOf = (id: string, letters: number) => {
    const cells = [...(blanks[id] ?? "")].slice(0, letters);
    while (cells.length < letters) cells.push(" ");
    return cells;
  };
  const saveCells = (id: string, cells: string[]) => set(id, cells.join("").trimEnd());
  const caretOf = (id: string, letters: number) => {
    const explicit = carets[id];
    if (explicit !== undefined) return Math.min(Math.max(explicit, 0), letters - 1);
    const empty = cellsOf(id, letters).indexOf(" ");
    return empty < 0 ? letters - 1 : empty;
  };
  const setCaret = (id: string, cell: number) => setCarets((current) => ({ ...current, [id]: cell }));

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
    const nextLetters = lettersOf(next);
    if (nextLetters > 0) {
      setCarets((current) => ({ ...current, [next]: direction > 0 ? 0 : nextLetters - 1 }));
    }
    focusBlankControl(root, next, direction > 0 ? "start" : "end");
  };

  const onBlankKeyDown = (id: string, event: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== end) {
      return;
    }
    if ((event.key === "ArrowRight" || event.key === "ArrowDown") && end === input.value.length) {
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

  const onLettersKeyDown = (id: string, letters: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const caret = caretOf(id, letters);
    const cells = cellsOf(id, letters);
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        if (caret > 0) setCaret(id, caret - 1);
        else moveBlank(id, -1);
        return;
      case "ArrowRight":
        event.preventDefault();
        if (caret < letters - 1) setCaret(id, caret + 1);
        else moveBlank(id, 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveBlank(id, -1);
        return;
      case "ArrowDown":
        event.preventDefault();
        moveBlank(id, 1);
        return;
      case "Home":
        event.preventDefault();
        setCaret(id, 0);
        return;
      case "End":
        event.preventDefault();
        setCaret(id, letters - 1);
        return;
      case "Backspace":
        event.preventDefault();
        if (cells[caret] !== " ") {
          cells[caret] = " ";
          saveCells(id, cells);
        } else if (caret > 0) {
          cells[caret - 1] = " ";
          saveCells(id, cells);
          setCaret(id, caret - 1);
        } else {
          moveBlank(id, -1);
        }
        return;
      case "Delete":
        event.preventDefault();
        cells[caret] = " ";
        saveCells(id, cells);
        return;
      default:
        if (event.key.length === 1) {
          event.preventDefault();
          if (event.key.trim() === "") return;
          cells[caret] = event.key;
          saveCells(id, cells);
          setCaret(id, Math.min(caret + 1, letters - 1));
        }
    }
  };

  const pasteLetters = (id: string, letters: number, text: string) => {
    const chars = [...text.replace(/\s+/g, "")];
    if (!chars.length) return;
    const cells = cellsOf(id, letters);
    let cell = caretOf(id, letters);
    for (const char of chars) {
      if (cell >= letters) break;
      cells[cell] = char;
      cell += 1;
    }
    saveCells(id, cells);
    setCaret(id, Math.min(cell, letters - 1));
  };

  const caretFromPointer = (id: string, input: HTMLInputElement, clientX: number) => {
    const cells = [...(input.parentElement?.querySelectorAll(".gap-letters-cell") ?? [])];
    let best = 0;
    let distance = Number.POSITIVE_INFINITY;
    cells.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      const d = Math.abs(clientX - (rect.left + rect.width / 2));
      if (d < distance) {
        distance = d;
        best = index;
      }
    });
    setCaret(id, best);
  };

  const renderBlank = (id: string, index: number) => {
    const number = startNumber + (sentenceMode ? Math.max(0, order.indexOf(id)) : index);
    const kind = kinds.get(id) ?? "gap";
    const showNumber = !sentenceMode && !hideBlankNumbers;
    const label = formatQuestionNumber(number, numberFormat);

    if (kind === "dropdown") {
      return (
        <span data-gap-blank={id} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25rem" }}>
          {showNumber ? <span style={gapNumberStyle} aria-hidden>{label}</span> : null}
          <Select
            size="sm"
            styles={gapSelectStyles}
            ariaLabel={`Question ${number}`}
            value={blanks[id] ?? ""}
            disabled={readOnly}
            onChange={(next) => set(id, next)}
            options={[
              { value: "", label: "–" },
              ...(options.choices?.[id] ?? []).map((choice) => ({ value: choice.id, label: choice.text })),
            ]}
          />
        </span>
      );
    }

    const letters = lettersOf(id);
    if (letters > 0) {
      const cells = cellsOf(id, letters);
      const activeCell = focusedBlank === id && !readOnly ? caretOf(id, letters) : -1;
      return (
        <span data-gap-blank={id} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25rem" }}>
          {showNumber ? <span style={gapNumberStyle} aria-hidden>{label}</span> : null}
          <span style={{ whiteSpace: "nowrap" }}>
            <span>{options.prefixes?.[id] ?? ""}</span>
            <span className="gap-letters">
              {cells.map((char, cell) => (
                <span key={cell} className="gap-letters-cell" data-active={cell === activeCell || undefined} aria-hidden>
                  {char === " " ? "\u200b" : char}
                </span>
              ))}
              <input
                className="gap-letters-input"
                aria-label={`Question ${number}: ${letters} letters`}
                value={blanks[id] ?? ""}
                readOnly={readOnly}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onFocus={() => setFocusedBlank(id)}
                onBlur={() => setFocusedBlank((current) => (current === id ? null : current))}
                onPointerDown={(event) => {
                  setFocusedBlank(id);
                  caretFromPointer(id, event.currentTarget, event.clientX);
                }}
                onChange={(event) => {
                  const next = [...event.target.value.replace(/\s+/g, "")].slice(0, letters);
                  set(id, next.join(""));
                  setCaret(id, Math.min(next.length, letters - 1));
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  pasteLetters(id, letters, event.clipboardData.getData("text"));
                }}
                onKeyDown={(event) => onLettersKeyDown(id, letters, event)}
              />
            </span>
          </span>
        </span>
      );
    }

    return (
      <span data-gap-blank={id} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25rem" }}>
        {showNumber ? <span style={gapNumberStyle} aria-hidden>{label}</span> : null}
        {kind === "tail" ? <span>{options.prefixes?.[id] ?? ""}</span> : null}
        <TextInput
          aria-label={`Question ${number}`}
          value={blanks[id] ?? ""}
          readOnly={readOnly}
          autoComplete="off"
          spellCheck={false}
          styles={gapInputStyles(kind === "tail")}
          onChange={(event) => set(id, event.target.value)}
          onKeyDown={(event) => onBlankKeyDown(id, event)}
        />
      </span>
    );
  };

  if (sentenceMode) {
    const blocks = (question.promptContent?.content ?? []).filter((node) => node.type !== "hardBreak");
    return (
      <Stack gap="sm" ref={rootRef}>
        {blocks.map((node, index) => {
          const number = startNumber + index;
          return (
            <Box
              key={index}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "baseline",
                lineHeight: 2.1,
              }}
            >
              <span
                style={{
                  flex: "none",
                  whiteSpace: "nowrap",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  fontWeight: 700,
                }}
              >
                {formatQuestionNumber(number, numberFormat)}
              </span>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <PromptView
                  doc={{ type: "doc", content: [node as DocNode] } as Doc}
                  startNumber={startNumber}
                  renderBlank={renderBlank}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box ref={rootRef} style={{ lineHeight: 2.1 }}>
      <PromptView
        doc={question.promptContent}
        renderBlank={renderBlank}
      />
    </Box>
  );
}
