import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { formatVideoTime } from "@/shared/lib/format";
import { ibaTheme } from "@/app/mantine/ibaTheme";
import { VideoPlayer } from "./VideoPlayer";

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
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(cleanup);

function renderPlayer(ui: ReactElement) {
  return render(<MantineProvider theme={ibaTheme}>{ui}</MantineProvider>);
}

describe("formatVideoTime", () => {
  it("formats current and duration style timestamps", () => {
    expect(formatVideoTime(0)).toBe("0:00");
    expect(formatVideoTime(42)).toBe("0:42");
    expect(formatVideoTime(195)).toBe("3:15");
  });
});

describe("VideoPlayer", () => {
  it("toggles play and pause from the control button", () => {
    const { container } = renderPlayer(<VideoPlayer src="/media/demo.mp4" aria-label="Демо" />);
    const video = container.querySelector("video");
    expect(video).toBeTruthy();
    const play = screen.getByRole("button", { name: "Воспроизвести" });
    fireEvent.click(play);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.play(video!);
    Object.defineProperty(video!, "paused", { configurable: true, value: false });
    expect(screen.getByRole("button", { name: "Пауза" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Пауза" }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    fireEvent.pause(video!);
    expect(screen.getByRole("button", { name: "Воспроизвести" })).toBeTruthy();
  });

  it("shows 0:00 while duration is unknown", () => {
    renderPlayer(<VideoPlayer src="/media/demo.mp4" />);
    expect(screen.getByText("0:00 / 0:00")).toBeTruthy();
  });

  it("exposes mute and fullscreen controls", () => {
    renderPlayer(<VideoPlayer src="/media/demo.mp4" />);
    expect(screen.getByRole("button", { name: "Выключить звук" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "На весь экран" })).toBeTruthy();
  });

  it("hides the control bar when controlsHidden", () => {
    const { container } = renderPlayer(<VideoPlayer src="/media/demo.mp4" controlsHidden />);
    expect(container.querySelector('[data-controls-hidden=""]')).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Воспроизвести" })).toBeNull();
    expect(screen.queryByText("0:00 / 0:00")).toBeNull();
  });

  it("stays hidden until the first frame is ready", () => {
    const { container } = renderPlayer(<VideoPlayer src="/media/demo.mp4" />);
    const root = container.querySelector(".iba-video-player");
    expect(root?.hasAttribute("data-frame-ready")).toBe(false);
    const video = container.querySelector("video");
    fireEvent.loadedData(video!);
    expect(root?.hasAttribute("data-frame-ready")).toBe(true);
  });
});