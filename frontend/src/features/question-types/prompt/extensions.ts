import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { EditorView } from "@tiptap/pm/view";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { newId } from "@/shared/lib/ids";
import { BlankNodeView } from "./BlankNodeView";

function inListOrTable($from: EditorView["state"]["selection"]["$from"]) {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === "listItem" || name === "tableCell" || name === "tableHeader") {
      return true;
    }
  }
  return false;
}

export function handleIndentTab(view: EditorView, event: KeyboardEvent): boolean {
  if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) {
    return false;
  }
  if (inListOrTable(view.state.selection.$from)) {
    return false;
  }
  event.preventDefault();
  const { state } = view;
  const { $from } = state.selection;
  if (event.shiftKey) {
    const before = $from.nodeBefore;
    if (!before?.isText) {
      return true;
    }
    const text = before.text ?? "";
    if (text.endsWith("\t")) {
      view.dispatch(state.tr.delete($from.pos - 1, $from.pos));
      return true;
    }
    const spaces = / {1,4}$/.exec(text);
    if (spaces) {
      view.dispatch(state.tr.delete($from.pos - spaces[0].length, $from.pos));
    }
    return true;
  }
  view.dispatch(state.tr.insertText("\t"));
  return true;
}

export const Blank = Node.create({
  name: "blank",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: () => newId(),
        renderHTML: (attributes) => ({ "data-blank": attributes.id }),
      },
      kind: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-kind"),
        renderHTML: (attributes) => (attributes.kind ? { "data-kind": attributes.kind } : {}),
      },
    };
  },
  parseHTML: () => [{ tag: "span[data-blank]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { contenteditable: "false" })],
  addNodeView() {
    return ReactNodeViewRenderer(BlankNodeView);
  },
});

export const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null },
    };
  },
});

export function editorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      trailingNode: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    MediaImage,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
    Blank,
  ];
}
