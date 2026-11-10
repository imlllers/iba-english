import { Tooltip } from "@mantine/core";
import { RichTextEditor as MantineRTE, type RichTextEditorLabels } from "@mantine/tiptap";
import { useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import type { Doc } from "@/entities/question/types";
import { newId } from "@/shared/lib/ids";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { BlankDisplayContext, type BlankDisplay } from "./BlankNodeView";
import { editorExtensions, handleIndentTab } from "./extensions";

function ListNumbersIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M11 6h9M11 12h9M12 18h8M4 16a2 2 0 1 1 4 0c0 .591-.5 1-1 1.5l-3 2.5h4M6 10V4L4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListLettersIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M11 6h9M11 12h9M11 18h9M4 10v-4.5a1.5 1.5 0 0 1 3 0V10M4 8h3M4 20h1.5a1.5 1.5 0 0 0 0-3H4h1.5a1.5 1.5 0 0 0 0-3H4v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type PromptMode = "plain" | "gaps" | "markers" | "inline";

export const FORMAT_TOOLBAR_HOST_ID = "builder-format-toolbar";

const FORMAT_LABELS: Partial<RichTextEditorLabels> = {
  h2ControlLabel: "Заголовок",
  h3ControlLabel: "Подзаголовок",
  boldControlLabel: "Полужирный",
  italicControlLabel: "Курсив",
  underlineControlLabel: "Подчёркнутый",
  strikeControlLabel: "Зачёркнутый",
  clearFormattingControlLabel: "Очистить форматирование",
  alignLeftControlLabel: "По левому краю",
  alignCenterControlLabel: "По центру",
  alignRightControlLabel: "По правому краю",
  bulletListControlLabel: "Маркированный список",
  orderedListControlLabel: "Нумерованный список",
  blockquoteControlLabel: "Цитата",
  hrControlLabel: "Горизонтальная линия",
  tableInsertControlLabel: "Вставить таблицу",
  tableMergeCellsControlLabel: "Объединить ячейки",
};

const BLANK_LINE = "_______";

const INLINE_TOOLS: { kind: "gap" | "tail" | "dropdown"; label: string; hint: string; icon: IconName }[] = [
  { kind: "gap", label: "Пропуск", hint: "Вставить пропуск – ученик впишет слово", icon: "blankGap" },
  { kind: "tail", label: "Дописать слово", hint: "Вставить начало слова – ученик допишет окончание", icon: "blankTail" },
  { kind: "dropdown", label: "Выпадающий список", hint: "Вставить выпадающий список вариантов", icon: "blankDropdown" },
];

function ControlTip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip label={label} openDelay={300}>
      {children}
    </Tooltip>
  );
}

type OrderedStyle = "1" | "A";

function currentOrderedStyle(editor: Editor): OrderedStyle | null {
  if (!editor.isActive("orderedList")) return null;
  const type = editor.getAttributes("orderedList").type;
  return type === "A" || type === "a" ? "A" : "1";
}

function toggleOrderedStyle(editor: Editor, style: OrderedStyle) {
  const current = currentOrderedStyle(editor);
  if (current === style) {
    editor.chain().focus().toggleOrderedList().run();
    return;
  }
  if (current) {
    editor.chain().focus().updateAttributes("orderedList", { type: style === "A" ? "A" : null }).run();
    return;
  }
  editor.chain().focus().toggleList("orderedList", "listItem", false, style === "A" ? { type: "A" } : {}).run();
}

function OrderedStyleControl({
  editor,
  style,
  label,
  children,
}: {
  editor: Editor;
  style: OrderedStyle;
  label: string;
  children: ReactNode;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current || current.isDestroyed) return false;
      return currentOrderedStyle(current) === style;
    },
  });

  return (
    <ControlTip label={label}>
      <MantineRTE.Control
        aria-label={label}
        title=""
        active={!!active}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleOrderedStyle(editor, style)}
      >
        {children}
      </MantineRTE.Control>
    </ControlTip>
  );
}

type ActiveFormat = { id: string; editor: Editor; mode: PromptMode };

let activeFormat: ActiveFormat | null = null;
const listeners = new Set<() => void>();
const mounted = new Set<string>();
let outsideClearTimer = 0;
let holdActiveUntil = 0;
let focusGuardInstalled = false;

function holdActiveFormat() {
  holdActiveUntil = Date.now() + 600;
}

function setActiveFormat(next: ActiveFormat | null) {
  if (next === null && Date.now() < holdActiveUntil) {
    return;
  }
  if (activeFormat?.id === next?.id && activeFormat?.editor === next?.editor && activeFormat?.mode === next?.mode) {
    return;
  }
  window.clearTimeout(outsideClearTimer);
  activeFormat = next;
  listeners.forEach((listener) => listener());
}

function subscribeActiveFormat(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useActiveFormat() {
  return useSyncExternalStore(subscribeActiveFormat, () => activeFormat);
}

function isFormatUiTarget(target: EventTarget | null) {
  return target instanceof Element && !!(
    target.closest(".ProseMirror")
    || target.closest("[data-format-toolbar]")
    || target.closest("[data-rich-text-editor-control]")
  );
}

function ensureFocusGuard() {
  if (focusGuardInstalled || typeof document === "undefined") return;
  focusGuardInstalled = true;
  document.addEventListener("focusin", (event) => {
    if (Date.now() < holdActiveUntil) return;
    if (isFormatUiTarget(event.target)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("input, textarea, select, [contenteditable='true']")) return;
    setActiveFormat(null);
  });
  document.addEventListener("pointerdown", (event) => {
    if (isFormatUiTarget(event.target)) {
      window.clearTimeout(outsideClearTimer);
      return;
    }
    window.clearTimeout(outsideClearTimer);
    outsideClearTimer = window.setTimeout(() => {
      if (isFormatUiTarget(document.activeElement)) return;
      if (activeFormat && document.activeElement === document.body) {
        return;
      }
      setActiveFormat(null);
    }, 0);
  });
}

function FormatToolbarControls({
  editor,
  mode,
  blankTools = true,
}: {
  editor: Editor;
  mode: PromptMode;
  blankTools?: boolean;
}) {
  const L = FORMAT_LABELS;
  return (
    <MantineRTE.Toolbar sticky={false}>
      <MantineRTE.ControlsGroup>
        <ControlTip label={L.h2ControlLabel!}><MantineRTE.H2 title="" /></ControlTip>
        <ControlTip label={L.h3ControlLabel!}><MantineRTE.H3 title="" /></ControlTip>
      </MantineRTE.ControlsGroup>
      <MantineRTE.ControlsGroup>
        <ControlTip label={L.boldControlLabel!}><MantineRTE.Bold title="" /></ControlTip>
        <ControlTip label={L.italicControlLabel!}><MantineRTE.Italic title="" /></ControlTip>
        <ControlTip label={L.underlineControlLabel!}><MantineRTE.Underline title="" /></ControlTip>
        <ControlTip label={L.strikeControlLabel!}><MantineRTE.Strikethrough title="" /></ControlTip>
        <ControlTip label={L.clearFormattingControlLabel!}><MantineRTE.ClearFormatting title="" /></ControlTip>
      </MantineRTE.ControlsGroup>
      <MantineRTE.ControlsGroup>
        <ControlTip label={L.alignLeftControlLabel!}><MantineRTE.AlignLeft title="" /></ControlTip>
        <ControlTip label={L.alignCenterControlLabel!}><MantineRTE.AlignCenter title="" /></ControlTip>
        <ControlTip label={L.alignRightControlLabel!}><MantineRTE.AlignRight title="" /></ControlTip>
      </MantineRTE.ControlsGroup>
      <MantineRTE.ControlsGroup>
        <ControlTip label={L.bulletListControlLabel!}><MantineRTE.BulletList title="" /></ControlTip>
        <OrderedStyleControl editor={editor} style="1" label={L.orderedListControlLabel!}>
          <ListNumbersIcon />
        </OrderedStyleControl>
        <OrderedStyleControl editor={editor} style="A" label="Список A, B, C">
          <ListLettersIcon />
        </OrderedStyleControl>
        <ControlTip label={L.blockquoteControlLabel!}><MantineRTE.Blockquote title="" /></ControlTip>
        <ControlTip label={L.hrControlLabel!}><MantineRTE.Hr title="" /></ControlTip>
      </MantineRTE.ControlsGroup>
      <MantineRTE.ControlsGroup>
        <ControlTip label={L.tableInsertControlLabel!}><MantineRTE.TableInsert title="" /></ControlTip>
        <ControlTip label={L.tableMergeCellsControlLabel!}><MantineRTE.TableMergeCells title="" /></ControlTip>
      </MantineRTE.ControlsGroup>
      {blankTools ? (
        <MantineRTE.ControlsGroup>
          <ControlTip label={`Вставить прочерк ${BLANK_LINE}`}>
            <MantineRTE.Control
              aria-label="Прочерк"
              title=""
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                editor.chain().focus().insertContent({ type: "text", text: BLANK_LINE }).run();
              }}
            >
              <Icon name="blankLine" />
            </MantineRTE.Control>
          </ControlTip>
          {INLINE_TOOLS.map((tool) => {
            const enabled = mode === "inline" || (tool.kind === "gap" && mode === "gaps");
            const hint = enabled ? tool.hint : `${tool.label} – только для полей с пропусками`;
            return (
              <ControlTip key={tool.kind} label={hint}>
                <MantineRTE.Control
                  aria-label={tool.label}
                  title=""
                  aria-disabled={!enabled}
                  data-disabled={!enabled || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (!enabled) return;
                    if (mode === "gaps") {
                      editor.chain().focus().insertContent({ type: "blank", attrs: { id: newId() } }).run();
                      return;
                    }
                    editor.chain().focus().insertContent({ type: "blank", attrs: { id: newId(), kind: tool.kind } }).run();
                  }}
                >
                  <Icon name={tool.icon} />
                </MantineRTE.Control>
              </ControlTip>
            );
          })}
          <ControlTip label={mode === "markers" ? "Вставить метку" : "Метка – только для полей с метками"}>
            <MantineRTE.Control
              aria-label="Метка"
              title=""
              aria-disabled={mode !== "markers"}
              data-disabled={mode !== "markers" || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (mode !== "markers") return;
                editor.chain().focus().insertContent({ type: "blank", attrs: { id: newId() } }).run();
              }}
            >
              <Icon name="blankMarker" />
            </MantineRTE.Control>
          </ControlTip>
        </MantineRTE.ControlsGroup>
      ) : null}
    </MantineRTE.Toolbar>
  );
}

export function FormatToolbarHost({ hideWhenInactive = false }: { hideWhenInactive?: boolean } = {}) {
  const active = useActiveFormat();
  const lastBound = useRef<ActiveFormat | null>(null);
  if (active) lastBound.current = active;
  const bound = active ?? lastBound.current;
  const idle = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: editorExtensions(""),
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
  const editor = bound?.editor && !bound.editor.isDestroyed ? bound.editor : idle;
  const mode = active?.mode ?? bound?.mode ?? "plain";
  const inactive = !active;

  useEffect(() => {
    ensureFocusGuard();
  }, []);

  if (hideWhenInactive && inactive) {
    return null;
  }

  if (!editor) {
    return null;
  }

  return (
    <div
      id={FORMAT_TOOLBAR_HOST_ID}
      data-format-toolbar
      data-inactive={inactive || undefined}
      className="builder-format-toolbar"
      aria-disabled={inactive}
      title={inactive ? "Кликните в текст с форматированием" : undefined}
      onMouseDown={(event) => {
        event.preventDefault();
        holdActiveFormat();
        if (lastBound.current?.editor && !lastBound.current.editor.isDestroyed) {
          setActiveFormat(lastBound.current);
        }
      }}
    >
      <MantineRTE editor={editor} labels={FORMAT_LABELS}>
        <FormatToolbarControls editor={editor} mode={mode} blankTools />
      </MantineRTE>
    </div>
  );
}

type RichTextEditorProps = {
  value: Doc;
  onChange: (doc: Doc) => void;
  mode?: PromptMode;
  numberBlanks?: boolean;
  startNumber?: number;
  label: string;
  toolbar?: "host" | "inline";
  blankTools?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  mode = "plain",
  numberBlanks = true,
  startNumber = 1,
  label,
  toolbar = "host",
  blankTools = true,
}: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const editorId = useId();
  const display = useMemo<BlankDisplay>(
    () => ({ mode, numberBlanks: numberBlanks ?? true, startNumber }),
    [mode, numberBlanks, startNumber],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions(mode === "markers" ? "Введите текст с метками A, B, C…" : "Введите текст задания"),
    content: value,
    editorProps: {
      attributes: { "aria-label": label },
      handleKeyDown: (view, event) => handleIndentTab(view, event),
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as Doc),
    onFocus: ({ editor: current }) => {
      setFocused(true);
      if (toolbar === "host") {
        setActiveFormat({ id: editorId, editor: current, mode });
      }
    },
    onBlur: () => {
      setFocused(false);
    },
  });

  useEffect(() => {
    ensureFocusGuard();
    mounted.add(editorId);
    return () => {
      mounted.delete(editorId);
      if (activeFormat?.id === editorId) setActiveFormat(null);
    };
  }, [editorId]);

  useEffect(() => {
    if (toolbar === "host" && activeFormat?.id === editorId && editor) {
      setActiveFormat({ id: editorId, editor, mode });
    }
  }, [editor, editorId, mode, toolbar]);

  if (!editor) {
    return null;
  }

  return (
    <BlankDisplayContext.Provider value={display}>
      <div
        onPointerDown={() => {
          if (toolbar === "host") {
            setActiveFormat({ id: editorId, editor, mode });
          }
        }}
      >
        <MantineRTE
          editor={editor}
          labels={FORMAT_LABELS}
          variant="default"
          styles={{
            root: {
              background: "var(--mantine-color-body)",
              borderRadius: "var(--mantine-radius-md)",
              borderColor: focused ? "var(--mantine-color-iba-6)" : undefined,
              transition: "border-color 100ms ease",
            },
            content: {
              minHeight: "var(--input-height-md)",
              fontSize: "var(--mantine-font-size-md)",
              lineHeight: "var(--mantine-line-height-md)",
              "& .ProseMirror": {
                paddingBlock: "var(--input-padding-y-md)",
                paddingInline: "calc(var(--input-height-md) / 3)",
              },
            },
          }}
        >
          {toolbar === "inline" ? (
            <div
              className="builder-format-toolbar inline-format-toolbar"
              data-format-toolbar
              onMouseDown={(event) => {
                event.preventDefault();
                holdActiveFormat();
              }}
            >
              <FormatToolbarControls editor={editor} mode={mode} blankTools={blankTools} />
            </div>
          ) : null}
          <MantineRTE.Content />
        </MantineRTE>
      </div>
    </BlankDisplayContext.Provider>
  );
}
