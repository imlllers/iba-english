import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/entities/question/types";
import type { MaterialBlock, PublicSection } from "@/entities/test/types";
import { buildRunnerPages } from "../../runnerPages";
import { pageGateAudios } from "../../pageAudioGate";
import {
  blockHasAudio,
  blockHasVisualMedia,
  excludeBlockAudioFromGate,
  withIntroPages,
  withPartExampleIntros,
  withScopeIntroPages,
} from "./toeflPages";
import type { PartExample } from "@/entities/test/types";

function question(id: string, blockId?: string | null): PublicQuestion {
  return {
    id,
    type: "SINGLE_CHOICE",
    promptContent: { type: "doc", content: [] },
    options: { choices: [] },
    settings: {},
    scoringConfig: { points: 1 },
    partId: null,
    materialBlockId: blockId ?? null,
    required: true,
    orderIndex: 0,
  } as unknown as PublicQuestion;
}

function block(id: string, withAudio: boolean, withImage = false): MaterialBlock {
  const items: MaterialBlock["items"] = withAudio
    ? [{ id: "a1", kind: "audio", mediaId: "media-1" }]
    : [{ id: "t1", kind: "text", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Passage" }] }] } }];
  if (withImage) {
    items.push({ id: "i1", kind: "image", mediaId: "media-2" });
  }
  return {
    id,
    title: `Group ${id}`,
    instructions: "",
    content: { type: "doc", content: [] },
    items,
    orderIndex: 0,
  };
}

describe("withIntroPages", () => {
  it("splits text block into per-question pages keeping block for split", () => {
    const b = block("b1", false);
    const section: PublicSection = {
      id: "s1",
      title: "Reading",
      instructions: "",
      orderIndex: 0,
      sectionType: "READING",
      timeLimitMinutes: null,
      materialBlocks: [b],
      questions: [question("q1", "b1"), question("q2", "b1")],
    };
    const base = buildRunnerPages([section], { oneQuestionPerPage: true, examType: "TOEFL" });
    const pages = withIntroPages(base, "TOEFL");
    const questionPages = pages.filter((p) => p.questions.length === 1);
    expect(questionPages).toHaveLength(2);
    expect(questionPages[0].block?.id).toBe("b1");
    expect(questionPages[1].block?.id).toBe("b1");
    expect(pages.some((p) => p.groupContent)).toBe(false);
  });

  it("keeps a single audio-group question on one page with block media", () => {
    const b = block("b3", true);
    const section: PublicSection = {
      id: "s1",
      title: "Listening",
      instructions: "",
      orderIndex: 0,
      sectionType: "LISTENING",
      timeLimitMinutes: null,
      materialBlocks: [b],
      questions: [question("q1", "b3")],
    };
    const base = buildRunnerPages([section], { oneQuestionPerPage: true, examType: "TOEFL" });
    const pages = withIntroPages(base, "TOEFL");
    expect(pages.filter((p) => p.groupContent)).toHaveLength(0);
    const questionPage = pages.find((p) => p.questions.some((q) => q.id === "q1"));
    expect(questionPage?.listenedBlock).toBe(true);
    expect(questionPage?.listenedBlockMediaOnly).toBe(false);
    expect(questionPage?.block?.id).toBe("b3");
    expect(excludeBlockAudioFromGate(questionPage!)).toBe(false);
    const gate = pageGateAudios(questionPage!).filter(
      (item) => !(excludeBlockAudioFromGate(questionPage!) && item.scope === "block"),
    );
    expect(gate.some((item) => item.scope === "block")).toBe(true);
  });

  it("detects image and video in block", () => {
    expect(blockHasVisualMedia(block("b2", true, true))).toBe(true);
    expect(blockHasVisualMedia(block("b2", true, false))).toBe(false);
  });

  it("adds groupContent only when block has audio", () => {
    const b = block("b2", true);
    const section: PublicSection = {
      id: "s1",
      title: "Listening",
      instructions: "",
      orderIndex: 0,
      sectionType: "LISTENING",
      timeLimitMinutes: null,
      materialBlocks: [b],
      questions: [question("q1", "b2"), question("q2", "b2")],
    };
    const base = buildRunnerPages([section], { oneQuestionPerPage: true, examType: "TOEFL" });
    const pages = withIntroPages(base, "TOEFL");
    expect(pages.filter((p) => p.groupContent)).toHaveLength(1);
    const after = pages.filter((p) => p.listenedBlock);
    expect(after).toHaveLength(2);
    expect(after.every((p) => p.block?.id === "b2")).toBe(true);
    expect(after.every((p) => p.listenedBlockMediaOnly)).toBe(true);
    for (const page of after) {
      expect(excludeBlockAudioFromGate(page)).toBe(true);
      const gate = pageGateAudios(page).filter(
        (item) => !(excludeBlockAudioFromGate(page) && item.scope === "block"),
      );
      expect(gate.some((item) => item.scope === "block")).toBe(false);
    }
  });
});

describe("blockHasAudio", () => {
  it("detects audio in block items", () => {
    expect(blockHasAudio(block("x", true))).toBe(true);
    expect(blockHasAudio(block("x", false))).toBe(false);
  });
});

describe("withPartExampleIntros", () => {
  it("adds part intro only when example is filled", () => {
    const example: PartExample = {
      blocks: [
        {
          id: "t1",
          kind: "text",
          doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Ex" }] }] },
        },
      ],
    };
    const section: PublicSection = {
      id: "s1",
      title: "Listening",
      instructions: "",
      orderIndex: 0,
      sectionType: "LISTENING",
      timeLimitMinutes: null,
      parts: [
        {
          id: "p1",
          title: "Part 1",
          instructions: "",
          orderIndex: 0,
          oneQuestionPerPage: true,
          example,
        },
      ],
      questions: [
        { ...question("q1"), partId: "p1" },
      ],
    };
    const base = buildRunnerPages([section], { oneQuestionPerPage: true, examType: "CUSTOM" });
    const pages = withPartExampleIntros(base);
    expect(pages.some((page) => page.intro === "part")).toBe(true);
  });
});

describe("withScopeIntroPages", () => {
  it("adds part intro even when part has no instructions", () => {
    const section: PublicSection = {
      id: "s1",
      title: "Listening",
      instructions: "",
      orderIndex: 0,
      sectionType: "LISTENING",
      timeLimitMinutes: null,
      parts: [
        {
          id: "p1",
          title: "Part 1",
          instructions: "",
          orderIndex: 0,
          oneQuestionPerPage: true,
        },
      ],
      questions: [
        { ...question("q1"), partId: "p1" },
      ],
    };
    const base = buildRunnerPages([section], { oneQuestionPerPage: true, examType: "TOEIC" });
    const pages = withScopeIntroPages(base);
    const partIntro = pages.find((page) => page.intro === "part");
    expect(partIntro).toBeDefined();
    expect(partIntro?.part?.title).toBe("Part 1");
    expect(partIntro?.questions).toHaveLength(0);
  });
});