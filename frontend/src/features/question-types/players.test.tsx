import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PublicQuestion, QuestionType } from "@/entities/question/types";
import { QuestionPlayer, isAnswered } from "./QuestionPlayer";
import { QUESTION_TYPES } from "./registry";

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
  class ResizeObserverStub {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverStub });
});

afterEach(cleanup);

const question = (type: QuestionType, options: unknown = {}): PublicQuestion => ({
  id: `q-${type}`,
  type,
  promptContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Prompt" }] }] },
  options,
  scoringConfig: {},
  orderIndex: 0,
  required: true,
  settings: {},
});

function renderPlayer(ui: ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("question players", () => {
  it.each(QUESTION_TYPES.filter((type) => type !== "SHORT_WRITTEN"))("%s renders with empty data and no answer", (type) => {
    const emptyOptions =
      type === "MATCHING" ? { left: [], right: [] }
      : type === "ORDER_SENTENCES" ? { items: [] }
      : {};
    renderPlayer(
      <QuestionPlayer
        question={question(type, emptyOptions)}
        kicker="Задание 1"
        answer={{}}
        onAnswer={() => undefined}
      />,
    );
    expect(screen.getAllByText("Задание 1").length).toBeGreaterThan(0);
    expect(isAnswered(question(type, emptyOptions), {})).toBe(false);
  });

  it("single choice sends the option id", () => {
    const onAnswer = vi.fn();
    renderPlayer(<QuestionPlayer question={question("SINGLE_CHOICE", [{ id: "a", text: "went" }, { id: "b", text: "goes" }])} kicker="1" answer={{}} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByLabelText(/goes/));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "b" });
  });

  it("multiple select keeps option order", () => {
    const onAnswer = vi.fn();
    const options = [{ id: "a", text: "one" }, { id: "b", text: "two" }, { id: "c", text: "three" }];
    renderPlayer(<QuestionPlayer question={question("MULTIPLE_SELECT", options)} kicker="1" answer={{ optionIds: ["c"] }} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByLabelText(/one/));
    expect(onAnswer).toHaveBeenCalledWith({ optionIds: ["a", "c"] });
  });

  it("ordering can be changed with keyboard arrows", () => {
    const onAnswer = vi.fn();
    const options = { items: [{ id: "x", text: "First" }, { id: "y", text: "Second" }] };
    renderPlayer(<QuestionPlayer question={question("ORDER_SENTENCES", options)} kicker="1" answer={{}} onAnswer={onAnswer} />);
    fireEvent.keyDown(screen.getByLabelText(/“Second”/), { key: "ArrowUp" });
    expect(onAnswer).toHaveBeenCalledWith({ order: ["y", "x"] });
  });

  it("ordering slots place a bank word into a gap", () => {
    const onAnswer = vi.fn();
    const options = {
      presentation: "slots" as const,
      items: [
        { id: "a", text: "tour guides" },
        { id: "b", text: "were" },
      ],
      distractors: [{ id: "d", text: "was" }],
      prefix: "The",
      suffix: "fantastic.",
      joiner: " ",
    };
    renderPlayer(<QuestionPlayer question={question("ORDER_SENTENCES", options)} kicker="1" answer={{}} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: "Drag “tour guides”" }));
    fireEvent.click(screen.getByLabelText("Slot 1, empty"));
    expect(onAnswer).toHaveBeenCalledWith({ order: ["a", null] });
    expect(isAnswered(question("ORDER_SENTENCES", options), { order: ["a", null] })).toBe(true);
  });

  it("read-only players do not accept input", () => {
    const onAnswer = vi.fn();
    renderPlayer(<QuestionPlayer question={question("SINGLE_CHOICE", [{ id: "a", text: "went" }])} kicker="1" answer={{ optionId: "a" }} readOnly />);
    const radio = screen.getByLabelText(/went/) as HTMLInputElement;
    expect(radio.checked).toBe(true);
    expect(radio.disabled).toBe(true);
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
