import { beforeAll, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { Doc } from "@/entities/question/types";
import { PromptView } from "./PromptView";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

const tableDoc: Doc = {
  type: "doc",
  content: [{
    type: "table",
    content: [{
      type: "tableRow",
      content: [
        {
          type: "tableCell",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Type of task" }],
          }],
        },
        {
          type: "tableCell",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Description" }],
          }],
        },
      ],
    }],
  }],
};

const letteredListDoc: Doc = {
  type: "doc",
  content: [{
    type: "orderedList",
    attrs: { type: "A" },
    content: [
      {
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: "First paragraph" }] }],
      },
      {
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Second paragraph" }] }],
      },
    ],
  }],
};

describe("PromptView", () => {
  it("renders paragraph text inside lettered list items", () => {
    render(
      <MantineProvider>
        <PromptView doc={letteredListDoc} />
      </MantineProvider>,
    );
    expect(screen.getByText("First paragraph")).toBeTruthy();
    expect(screen.getByText("Second paragraph")).toBeTruthy();
  });

  it("renders text inside table cells", () => {
    render(
      <MantineProvider>
        <PromptView doc={tableDoc} />
      </MantineProvider>,
    );
    expect(screen.getByText("Type of task")).toBeTruthy();
    expect(screen.getByText("Description")).toBeTruthy();
  });
});