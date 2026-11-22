import { describe, expect, it } from "vitest";
import { toeflAllowChromeNext } from "./toeflNavigation";

const base = {
  demoMode: false,
  speakingAutoFlow: true,
  listeningLocked: false,
  introAudioCount: 0,
  groupContent: false,
  examAudioOn: false,
  earlyNextInGroup: false,
  earlyNextListening: false,
};

describe("toeflAllowChromeNext", () => {
  it("allows Next on section intro when speaking auto-flow is on", () => {
    expect(toeflAllowChromeNext({ ...base, intro: "section" })).toBe(true);
  });

  it("blocks Next on speaking questions when auto-flow is on", () => {
    expect(toeflAllowChromeNext({ ...base })).toBe(false);
  });

  it("blocks listening section intro while intro audio queue is pending", () => {
    expect(toeflAllowChromeNext({
      ...base,
      speakingAutoFlow: false,
      listeningLocked: true,
      intro: "section",
      introAudioCount: 1,
    })).toBe(false);
  });
});