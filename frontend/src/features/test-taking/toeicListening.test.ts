import { describe, expect, it } from "vitest";
import { buildRunnerPages } from "./runnerPages";
import { screenAnswerSeconds, screenHasTimedQuestions } from "./toeicListening";
import type { PublicSection } from "@/entities/test/types";

describe("TOEIC runner pages", () => {
  it("splits listening part with oneQuestionPerPage false into block pages", () => {
    const section: PublicSection = {
      id: "s1",
      title: "Listening",
      instructions: "",
      sectionType: "LISTENING",
      timeLimitMinutes: null,
      orderIndex: 0,
      questions: [
        { id: "q1", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b1", orderIndex: 0, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
        { id: "q2", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b1", orderIndex: 1, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
        { id: "q3", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b2", orderIndex: 2, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
      ],
      parts: [{ id: "p1", title: "Part 3", instructions: "", orderIndex: 2, oneQuestionPerPage: false }],
      materialBlocks: [
        { id: "b1", title: "Group 1", instructions: "", content: { type: "doc", content: [] }, orderIndex: 0, partId: "p1" },
        { id: "b2", title: "Group 2", instructions: "", content: { type: "doc", content: [] }, orderIndex: 1, partId: "p1" },
      ],
    };
    const pages = buildRunnerPages([section], { examType: "TOEIC", oneQuestionPerPage: true });
    expect(pages).toHaveLength(2);
    expect(pages[0].questions).toHaveLength(2);
    expect(pages[1].questions).toHaveLength(1);
  });

  it("splits reading part with oneQuestionPerPage false into block pages", () => {
    const section: PublicSection = {
      id: "s1",
      title: "Reading",
      instructions: "",
      sectionType: "READING",
      timeLimitMinutes: null,
      orderIndex: 1,
      questions: [
        { id: "q1", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b1", orderIndex: 0, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
        { id: "q2", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b1", orderIndex: 1, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
        { id: "q3", type: "SINGLE_CHOICE", partId: "p1", materialBlockId: "b2", orderIndex: 2, required: true, promptContent: { type: "doc", content: [] }, options: {}, scoringConfig: {}, settings: {} },
      ],
      parts: [{ id: "p1", title: "Part 6", instructions: "", orderIndex: 1, oneQuestionPerPage: false }],
      materialBlocks: [
        { id: "b1", title: "Passage A", instructions: "", content: { type: "doc", content: [] }, orderIndex: 0, partId: "p1" },
        { id: "b2", title: "Passage B", instructions: "", content: { type: "doc", content: [] }, orderIndex: 1, partId: "p1" },
      ],
    };
    const pages = buildRunnerPages([section], { examType: "TOEIC", oneQuestionPerPage: true });
    expect(pages).toHaveLength(2);
    expect(pages[0].block?.id).toBe("b1");
    expect(pages[0].questions).toHaveLength(2);
    expect(pages[1].block?.id).toBe("b2");
    expect(pages[1].questions).toHaveLength(1);
  });

  it("uses max question time limit on screen", () => {
    const page = {
      key: "block-1",
      section: { sectionType: "LISTENING" } as PublicSection,
      sectionIndex: 0,
      part: { id: "p1", title: "Part 3", instructions: "", orderIndex: 2 },
      block: null,
      questions: [
        { id: "q1", settings: { timeLimitSeconds: 5 } },
        { id: "q2", settings: { timeLimitSeconds: 8 } },
        { id: "q3", settings: { timeLimitSeconds: 12 } },
      ] as PublicSection["questions"],
      start: 1,
      count: 3,
      end: 3,
    };
    expect(screenAnswerSeconds(page)).toBe(12);
    expect(screenHasTimedQuestions(page)).toBe(true);
  });

  it("reports no timed questions when limits missing", () => {
    const page = {
      key: "block-1",
      section: { sectionType: "LISTENING" } as PublicSection,
      sectionIndex: 0,
      part: null,
      block: null,
      questions: [{ id: "q1", settings: {} }] as PublicSection["questions"],
      start: 1,
      count: 1,
      end: 1,
    };
    expect(screenAnswerSeconds(page)).toBe(0);
    expect(screenHasTimedQuestions(page)).toBe(false);
  });
});