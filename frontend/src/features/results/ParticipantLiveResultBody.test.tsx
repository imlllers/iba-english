import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { ParticipantLiveResultBody } from "./ParticipantLiveResultBody";

afterEach(() => {
  cleanup();
});

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

function wrap(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("ParticipantLiveResultBody", () => {
  it("shows score, email, and close line", () => {
    wrap(
      <ParticipantLiveResultBody
        examType="TOEFL"
        resultDetail="score_only"
        showResultToParticipant
        emailResultToParticipant
        participantEmail="student@example.com"
        hasSpeakingSection
        scoreVisible
        score={42}
        maxScore={50}
      />,
    );
    expect(screen.getByText("Test completed").textContent).toBe("Test completed");
    expect(screen.getByText(/Your answers have been submitted/i).textContent).toContain("close this page");
    expect(screen.getByText("Overall Score").textContent).toBe("Overall Score");
    expect(screen.getByText("student@example.com").textContent).toBe("student@example.com");
  });

  it("shows email line without participant email when delivery is enabled", () => {
    wrap(
      <ParticipantLiveResultBody
        examType="TOEFL"
        resultDetail="score_only"
        showResultToParticipant={false}
        emailResultToParticipant
        hasSpeakingSection
        scoreVisible={false}
      />,
    );
    expect(screen.getByText(/Your result will be sent to/i).textContent).toContain("sent to");
  });

  it("hides overall score for IELTS without Speaking section", () => {
    wrap(
      <ParticipantLiveResultBody
        examType="IELTS"
        resultDetail="score_only"
        showResultToParticipant
        emailResultToParticipant={false}
        hasSpeakingSection={false}
        scoreVisible
        score={30}
        maxScore={40}
      />,
    );
    expect(screen.queryByText("Overall Score")).toBeNull();
    expect(screen.getByText(/The Speaking section is taken separately/i).textContent).toContain("Speaking");
  });
});