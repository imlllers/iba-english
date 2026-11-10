import type { CSSProperties } from "react";

export const gapNumberStyle: CSSProperties = {
  display: "inline",
  marginRight: "0.25em",
  fontSize: "1em",
  lineHeight: "inherit",
  fontWeight: 700,
  color: "inherit",
  verticalAlign: "baseline",
};

const gapControlInput = {
  height: 32,
  minHeight: 32,
  padding: "0 8px",
  border: "1px solid var(--mantine-color-gray-3)",
  borderRadius: "var(--mantine-radius-sm)",
  background: "var(--mantine-color-body)",
  fontSize: "var(--mantine-font-size-md)",
} as const;

export function gapInputStyles(narrow = false) {
  return {
    root: {
      display: "inline-block",
      width: narrow ? 96 : 160,
      verticalAlign: "middle",
      margin: "6px 2px",
    },
    input: gapControlInput,
  } as const;
}

export const gapSelectStyles = {
  root: {
    display: "inline-block",
    width: "auto",
    minWidth: 120,
    maxWidth: 220,
    margin: "6px 2px",
    verticalAlign: "middle",
  },
  input: gapControlInput,
  wrapper: {
    display: "inline-block",
  },
} as const;

export const errorCorrectionInputStyles = {
  root: {
    display: "inline-block",
    width: "6.5em",
    minWidth: "4em",
    maxWidth: "12em",
    margin: "0 0 0 0.25em",
    verticalAlign: "baseline",
    lineHeight: "inherit",
  },
  wrapper: {
    display: "inline-block",
    lineHeight: "inherit",
  },
  input: {
    height: "1em",
    minHeight: "1em",
    padding: 0,
    borderWidth: 0,
    borderBottom: "1px solid var(--mantine-color-iba-6)",
    borderRadius: 0,
    background: "transparent",
    fontSize: "inherit",
    lineHeight: "inherit",
    fontWeight: 500,
  },
} as const;
