import { Badge, Box, Image } from "@mantine/core";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Doc, DocMark, DocNode } from "@/entities/question/types";
import { blankIds } from "../content";
import { useMedia } from "../media/MediaContext";

export type BlankRenderer = (id: string, index: number) => ReactNode;

type PromptViewProps = {
  doc: Doc;
  renderBlank?: BlankRenderer;
  markers?: boolean;
  startNumber?: number;
};

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;
const ALIGN: Record<string, CSSProperties> = {
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  justify: { textAlign: "justify" },
};

export function PromptView({ doc, renderBlank, markers = false, startNumber = 1 }: PromptViewProps) {
  const media = useMedia();
  const order = blankIds(doc);
  const fallback: BlankRenderer = (_, index) => (
    <Badge component="span" variant={markers ? "light" : "outline"} color="iba" size="sm" radius="sm">
      {markers ? String.fromCharCode(65 + index) : startNumber + index}
    </Badge>
  );
  const blank = renderBlank ?? fallback;

  const render = (node: DocNode, key: number | string): ReactNode => {
    if (node.type === "text") {
      return wrapMarks(node.text ?? "", node.marks ?? [], key);
    }
    if (node.type === "hardBreak") {
      return <br key={key} />;
    }
    if (node.type === "blank") {
      const id = String(node.attrs?.id ?? "");
      return (
        <Box
          key={key}
          component="span"
          display="inline-flex"
          style={{ alignItems: "baseline", gap: "0.15em", verticalAlign: "baseline", margin: "4px 1px" }}
        >
          {blank(id, order.indexOf(id))}
        </Box>
      );
    }
    if (node.type === "image") {
      const mediaId = typeof node.attrs?.mediaId === "string" ? node.attrs.mediaId : "";
      const src = mediaId ? media.asset(mediaId) : "";
      return src ? <Image key={key} src={src} alt={String(node.attrs?.alt ?? "")} maw="100%" mah={250} fit="contain" radius="sm" my="xs" /> : null;
    }
    const children = (node.content ?? []).map((child, index) => render(child, index));
    const align = ALIGN[String(node.attrs?.textAlign ?? "")] ?? undefined;
    const body = isEmptyBlock(node) ? "\u00A0" : children;
    switch (node.type) {
      case "heading":
        return Number(node.attrs?.level) === 3
          ? <h3 key={key} style={align}>{body}</h3>
          : <h2 key={key} style={align}>{body}</h2>;
      case "bulletList":
        return <ul key={key}>{children}</ul>;
      case "orderedList": {
        const listType = String(node.attrs?.type ?? "");
        return (
          <ol key={key} type={listType === "A" || listType === "a" || listType === "I" || listType === "i" ? listType : undefined}>
            {children}
          </ol>
        );
      }
      case "listItem":
        return <li key={key}>{isEmptyBlock(node) ? "\u00A0" : children}</li>;
      case "blockquote":
        return (
          <blockquote key={key} className="iba-blockquote">
            {children}
          </blockquote>
        );
      case "horizontalRule":
        return <hr key={key} />;
      case "codeBlock":
        return <pre key={key}>{body}</pre>;
      case "table":
        return (
          <Box key={key} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>{children}</tbody></table>
          </Box>
        );
      case "tableRow":
        return <tr key={key}>{children}</tr>;
      case "tableHeader":
        return <th key={key} colSpan={span(node.attrs?.colspan)} rowSpan={span(node.attrs?.rowspan)} style={{ border: "1px solid var(--mantine-color-gray-3)", padding: "6px 8px", background: "var(--mantine-color-gray-0)" }}>{body}</th>;
      case "tableCell":
        return <td key={key} colSpan={span(node.attrs?.colspan)} rowSpan={span(node.attrs?.rowspan)} style={{ border: "1px solid var(--mantine-color-gray-3)", padding: "6px 8px", verticalAlign: "top" }}>{body}</td>;
      default:
        return <p key={key} style={align}>{body}</p>;
    }
  };

  return (
    <Box className="iba-prompt" style={{ fontWeight: 500 }}>
      {(doc?.content ?? []).map((node, index) => render(node, index))}
    </Box>
  );
}

function span(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 1 ? number : undefined;
}

function isEmptyBlock(node: DocNode): boolean {
  const content = node.content ?? [];
  if (content.length === 0) return true;
  return content.every((child) => {
    if (child.type === "hardBreak") return false;
    if (child.type === "text") return !(child.text ?? "").length;
    if (child.type === "blank" || child.type === "image") return false;
    return isEmptyBlock(child);
  });
}

function wrapMarks(text: string, marks: DocMark[], key: number | string): ReactNode {
  const content = marks.reduce<ReactNode>((inner, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{inner}</strong>;
      case "italic":
        return <em>{inner}</em>;
      case "underline":
        return <u>{inner}</u>;
      case "strike":
        return <s>{inner}</s>;
      case "code":
        return <code>{inner}</code>;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        return SAFE_LINK.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
      }
      default:
        return inner;
    }
  }, text);
  return <Fragment key={key}>{content}</Fragment>;
}
