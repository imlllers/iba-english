import { Box, UnstyledButton } from "@mantine/core";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Item } from "@/entities/question/types";
import { groupSegments } from "../../content";

export { groupSegments };

type SegmentTextProps = {
  segments: Item[];
  isOn: (id: string) => boolean;
  onToggle?: (id: string) => void;
  tone?: "select" | "error";
  label: string;
  asList?: boolean;
  sourceText?: string;
  startNumber?: number;
  renderAfter?: (segment: Item) => ReactNode;
};

function segmentStyle(on: boolean, tone: "select" | "error"): CSSProperties {
  const base: CSSProperties = {
    display: "inline",
    margin: 0,
    padding: "0 1px",
    border: 0,
    borderRadius: "var(--mantine-radius-sm)",
    background: "transparent",
    font: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    verticalAlign: "baseline",
    textAlign: "left",
    cursor: "pointer",
    color: "inherit",
  };
  if (!on) return base;
  if (tone === "error") {
    return {
      ...base,
      background: "var(--mantine-color-gray-1)",
      boxShadow: "inset 0 -2px 0 var(--mantine-color-red-6)",
      color: "var(--mantine-color-red-7)",
      textDecoration: "line-through",
    };
  }
  return {
    ...base,
    background: "var(--mantine-color-iba-1)",
    boxShadow: "inset 0 -2px 0 var(--mantine-color-iba-6)",
    color: "var(--mantine-color-iba-9)",
  };
}

function WordButtons({
  segments,
  isOn,
  onToggle,
  tone,
  renderAfter,
}: {
  segments: Item[];
  isOn: (id: string) => boolean;
  onToggle?: (id: string) => void;
  tone: "select" | "error";
  renderAfter?: (segment: Item) => ReactNode;
}) {
  return (
    <>
      {segments.map((segment, index) => {
        const on = isOn(segment.id);
        return (
          <Fragment key={segment.id}>
            {index > 0 ? " " : null}
            <UnstyledButton
              type="button"
              style={segmentStyle(on, tone)}
              aria-pressed={on}
              disabled={!onToggle}
              onClick={() => onToggle?.(segment.id)}
            >
              {segment.text}
            </UnstyledButton>
            {on ? renderAfter?.(segment) : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function SegmentText({
  segments,
  isOn,
  onToggle,
  tone = "select",
  label,
  asList = false,
  sourceText = "",
  startNumber = 1,
  renderAfter,
}: SegmentTextProps) {
  if (!asList) {
    return (
      <p style={{ margin: 0, lineHeight: "inherit" }} aria-label={label}>
        <WordButtons
          segments={segments}
          isOn={isOn}
          onToggle={onToggle}
          tone={tone}
          renderAfter={renderAfter}
        />
      </p>
    );
  }

  const groups = groupSegments(segments, sourceText);
  return (
    <Box
      component="ol"
      start={startNumber}
      m={0}
      pl="xl"
      aria-label={label}
      style={{ display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-sm)", lineHeight: "inherit" }}
    >
      {groups.map((group, index) => (
        <Box component="li" key={group[0]?.id ?? index} style={{ display: "list-item" }}>
          <WordButtons
            segments={group}
            isOn={isOn}
            onToggle={onToggle}
            tone={tone}
            renderAfter={renderAfter}
          />
        </Box>
      ))}
    </Box>
  );
}
