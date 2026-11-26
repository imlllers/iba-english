import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { PartExampleView } from "./PartExampleView";
import { MediaProvider } from "../media/MediaContext";

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

function wrap(ui: React.ReactNode) {
  return render(
    <MantineProvider>
      <MediaProvider value={{ asset: (id) => `/media/${id}`, recording: (id) => `/media/${id}` }}>
        {ui}
      </MediaProvider>
    </MantineProvider>,
  );
}

describe("PartExampleView", () => {
  it("renders example label and parenthesized choices", () => {
    wrap(
      <PartExampleView
        example={{
          blocks: [
            {
              id: "c1",
              kind: "choices",
              correctId: "o2",
              options: [
                { id: "o1", text: "One" },
                { id: "o2", text: "Two" },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Example")).toBeTruthy();
    expect(screen.getByText("(A)")).toBeTruthy();
    expect(screen.getByText("(B)")).toBeTruthy();
  });
});