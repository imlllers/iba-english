import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import type { ScaleResult } from "@/entities/attempt/types";
import { ParticipantScoreDisplay } from "./ParticipantScoreDisplay";

afterEach(() => cleanup());

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

const sampleScale: ScaleResult = {
  title: "Band",
  complete: true,
  total: 5.5,
  level: "C1",
  sections: [
    { index: 0, name: "Reading", method: "table", min: 0, max: 6, step: 0.5, testSectionTitle: "Reading", raw: 28, rawMax: 30, score: 6, pending: false },
    { index: 1, name: "Listening", method: "table", min: 0, max: 6, step: 0.5, testSectionTitle: "Listening", raw: 25, rawMax: 30, score: 5, pending: false },
    { index: 2, name: "Writing", method: "manual", min: 0, max: 6, step: 0.5, testSectionTitle: "Writing", raw: null, rawMax: null, score: 5.5, pending: false },
    { index: 3, name: "Speaking", method: "manual", min: 0, max: 6, step: 0.5, testSectionTitle: "Speaking", raw: null, rawMax: null, score: 5, pending: false },
  ],
};

function wrap(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("ParticipantScoreDisplay", () => {
  it("renders overall gauge and section grid", () => {
    wrap(<ParticipantScoreDisplay scale={sampleScale} />);
    expect(screen.getByText("Overall Score").textContent).toBe("Overall Score");
    expect(screen.getByText("CEFR: C1").textContent).toBe("CEFR: C1");
    expect(screen.getByText("Reading").textContent).toBe("Reading");
    expect(screen.getByText("6 of 6").textContent).toBe("6 of 6");
  });

  it("hides overall block when requested", () => {
    wrap(<ParticipantScoreDisplay scale={sampleScale} hideOverall />);
    expect(screen.queryByText("Overall Score")).toBeNull();
    expect(screen.getByText("Listening").textContent).toBe("Listening");
  });

  it("uses totalMax for TOEIC overall gauge", () => {
    const toeic: ScaleResult = {
      title: "TOEIC Listening & Reading",
      complete: true,
      total: 600,
      totalMax: 990,
      hasLevels: true,
      level: "B1",
      sections: [
        { index: 0, name: "Listening", method: "table", min: 5, max: 495, step: 5, testSectionTitle: "Listening", raw: 80, rawMax: 100, score: 300, pending: false },
        { index: 1, name: "Reading", method: "table", min: 5, max: 495, step: 5, testSectionTitle: "Reading", raw: 70, rawMax: 100, score: 300, pending: false },
      ],
    };
    wrap(<ParticipantScoreDisplay scale={toeic} examType="TOEIC" />);
    expect(screen.getByText("600 of 990").textContent).toBe("600 of 990");
    const labels = screen.getAllByText(/Listening|Reading/).map((node) => node.textContent);
    expect(labels[0]).toBe("Listening");
    expect(labels[1]).toBe("Reading");
  });

  it("shows pending manual section", () => {
    const sw: ScaleResult = {
      title: "TOEIC Speaking & Writing",
      complete: false,
      total: null,
      totalMax: 400,
      hasLevels: false,
      level: null,
      sections: [
        { index: 0, name: "Speaking", method: "manual", min: 0, max: 200, step: 10, testSectionTitle: "Speaking", raw: null, rawMax: null, score: null, pending: true },
        { index: 1, name: "Writing", method: "manual", min: 0, max: 200, step: 10, testSectionTitle: "Writing", raw: null, rawMax: null, score: null, pending: true },
      ],
    };
    wrap(<ParticipantScoreDisplay scale={sw} examType="TOEIC" hideOverall />);
    expect(screen.getAllByText("Score coming soon").length).toBe(2);
  });
});