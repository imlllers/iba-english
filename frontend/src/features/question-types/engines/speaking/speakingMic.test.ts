import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireSpeakingMic, holdSpeakingMic, releaseSpeakingMic, resetSpeakingMic } from "./speakingMic";

function fakeStream() {
  const track = {
    readyState: "live",
    stop: vi.fn(() => {
      track.readyState = "ended";
    }),
  };
  return {
    getTracks: () => [track],
    get active() {
      return track.readyState === "live";
    },
    track,
  };
}

describe("speakingMic", () => {
  beforeEach(() => {
    resetSpeakingMic();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetSpeakingMic();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reuses one getUserMedia stream across holds", async () => {
    const first = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(first);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    const a = await holdSpeakingMic();
    const b = await holdSpeakingMic();
    const c = await acquireSpeakingMic();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(a).toBe(first);
    expect(b).toBe(first);
    expect(c).toBe(first);
  });

  it("keeps the stream across a release/hold in the same turn", async () => {
    const first = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(first);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await holdSpeakingMic();
    releaseSpeakingMic();
    await holdSpeakingMic();
    await vi.runAllTimersAsync();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(first.track.stop).not.toHaveBeenCalled();
  });

  it("stops tracks after the last holder releases", async () => {
    const first = fakeStream();
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(first) },
    });

    await holdSpeakingMic();
    releaseSpeakingMic();
    await vi.runAllTimersAsync();

    expect(first.track.stop).toHaveBeenCalledTimes(1);
  });
});
