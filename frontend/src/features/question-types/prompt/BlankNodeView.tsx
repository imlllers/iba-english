import { Box } from "@mantine/core";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { createContext, useContext } from "react";

export type BlankDisplay = {
  mode: "plain" | "gaps" | "markers" | "inline";
  numberBlanks: boolean;
  startNumber: number;
};

export const BlankDisplayContext = createContext<BlankDisplay>({
  mode: "plain",
  numberBlanks: true,
  startNumber: 1,
});

function blankIndex(editor: NodeViewProps["editor"], getPos: NodeViewProps["getPos"]) {
  const pos = typeof getPos === "function" ? getPos() : null;
  if (pos == null || typeof pos !== "number") {
    return 0;
  }
  let index = 0;
  editor.state.doc.descendants((node, nodePos) => {
    if (node.type.name === "blank" && nodePos < pos) {
      index += 1;
    }
    return true;
  });
  return index;
}

function letter(index: number) {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function BlankNodeView({ node, editor, getPos }: NodeViewProps) {
  const display = useContext(BlankDisplayContext);
  const kind = (node.attrs.kind as string | null) ?? null;
  const index = blankIndex(editor, getPos);
  const markers = display.mode === "markers";
  const showNumber = display.numberBlanks || markers;
  const label = markers
    ? letter(index)
    : showNumber
      ? String(display.startNumber + index)
      : "";
  const suffix = kind === "tail" ? " …" : kind === "dropdown" ? " ▾" : "";

  return (
    <NodeViewWrapper as="span" style={{ display: "inline", verticalAlign: "baseline" }}>
      <Box
        component="span"
        contentEditable={false}
        style={{
          display: "inline",
          fontSize: "1em",
          lineHeight: "inherit",
          fontWeight: 700,
          color: "var(--mantine-color-iba-8)",
          verticalAlign: "baseline",
          cursor: "default",
          userSelect: "none",
          whiteSpace: "nowrap",
          padding: markers ? "0 0.35em" : "0 0.15em",
          margin: "0 0.1em",
          borderRadius: markers ? "var(--mantine-radius-sm)" : 0,
          background: markers ? "var(--mantine-color-iba-0)" : undefined,
          borderBottom: markers ? undefined : "0.12em solid var(--mantine-color-iba-6)",
        }}
      >
        {label}{suffix}
      </Box>
    </NodeViewWrapper>
  );
}
