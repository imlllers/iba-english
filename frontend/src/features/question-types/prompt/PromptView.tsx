import { Badge, Box, Image } from "@mantine/core";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Doc, DocMark, DocNode } from "@/entities/question/types";
import { blankIds } from "../content";
import { useMedia } from "../media/MediaContext";
import { layoutGapAdjacentInlines, type GapAdjacentAffix } from "./gapAdjacentInlines";

export type BlankRenderer = (id: string, index: number, affixes?: GapAdjacentAffix) => ReactNode;

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
  const fallback: BlankRenderer = (_, index, affixes) => (
    <Box component="span" style={{ whiteSpace: "nowrap" }}>
      {affixes?.before ? <span>{affixes.before}</span> : null}
      <Badge component="span" variant={markers ? "light" : "outline"} color="iba" size="sm" radius="sm">
        {markers ? String.fromCharCode(65 + index) : startNumber + index}
      </Badge>
      {affixes?.after ? <span>{affixes.after}</span> : null}
    </Box>
  );
  const blank = renderBlank ?? fallback;

  const renderInlineChildren = (children: DocNode[], keyPrefix: string | number): ReactNode[] => {
    const { textAt, blankAffix } = layoutGapAdjacentInlines(children);
    const nodes: ReactNode[] = [];
    children.forEach((child, index) => {
      if (child.type === "text") {
        const text = textAt[index] ?? child.text ?? "";
        if (!text) {
          return;
        }
        nodes.push(wrapMarks(text, child.marks ?? [], `${keyPrefix}-t${index}`));
        return;
      }
      if (child.type === "hardBreak") {
        nodes.push(<br key={`${keyPrefix}-br${index}`} />);
        return;
      }
      if (child.type === "blank") {
        const id = String(child.attrs?.id ?? "");
        const affix = blankAffix[index] ?? { before: "", after: "" };
        nodes.push(
          <Box
            key={`${keyPrefix}-b${index}`}
            component="span"
            display="inline-flex"
            style={{
              alignItems: "baseline",
              verticalAlign: "baseline",
              whiteSpace: "nowrap",
            }}
          >
            {blank(id, order.indexOf(id), affix.before || affix.after ? affix : undefined)}
          </Box>,
        );
        return;
      }
      if (child.type === "image") {
        nodes.push(render(child, `${keyPrefix}-i${index}`));
      }
    });
    return nodes;
  };

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
          style={{ alignItems: "baseline", verticalAlign: "baseline", whiteSpace: "nowrap" }}
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
    const content = node.content ?? [];
    const align = ALIGN[String(node.attrs?.textAlign ?? "")] ?? undefined;
    const inlineBody = renderInlineChildren(content, key);
    const body = isEmptyBlock(node) ? "\u00A0" : inlineBody;
    switch (node.type) {
      case "heading":
        return Number(node.attrs?.level) === 3
          ? <h3 key={key} style={align}>{body}</h3>
          : <h2 key={key} style={align}>{body}</h2>;
      case "bulletList":
        return <ul key={key}>{content.map((child, index) => render(child, index))}</ul>;
      case "orderedList": {
        const listType = String(node.attrs?.type ?? "");
        return (
          <ol key={key} type={listType === "A" || listType === "a" || listType === "I" || listType === "i" ? listType : undefined}>
            {content.map((child, index) => render(child, index))}
          </ol>
        );
      }
      case "listItem": {
        const blockChildren = content.some(
          (child) => child.type !== "text" && child.type !== "hardBreak" && child.type !== "blank" && child.type !== "image",
        );
        if (blockChildren) {
          return (
            <li key={key}>
              {content.map((child, index) => render(child, `${key}-${index}`))}
            </li>
          );
        }
        return <li key={key}>{isEmptyBlock(node) ? "\u00A0" : body}</li>;
      }
      case "blockquote":
        return (
          <blockquote key={key} className="iba-blockquote">
            {body}
          </blockquote>
        );
      case "horizontalRule":
        return <hr key={key} />;
      case "codeBlock":
        return <pre key={key}>{body}</pre>;
      case "table":
        return (
          <Box key={key} className="iba-prompt-table-wrap">
            <table className="iba-prompt-table"><tbody>{content.map((child, index) => render(child, index))}</tbody></table>
          </Box>
        );
      case "tableRow":
        return <tr key={key}>{content.map((child, index) => render(child, index))}</tr>;
      case "tableHeader":
      case "tableCell": {
        const cellBody = isEmptyBlock(node)
          ? "\u00A0"
          : content.map((child, index) => render(child, index));
        return (
          <td
            key={key}
            colSpan={span(node.attrs?.colspan)}
            rowSpan={span(node.attrs?.rowspan)}
            style={{ border: "1px solid var(--mantine-color-gray-3)", padding: "6px 8px", verticalAlign: "top" }}
          >
            {cellBody}
          </td>
        );
      }
      default:
        return <p key={key} style={align}>{body}</p>;
    }
  };

  return (
    <Box className="iba-prompt">
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
