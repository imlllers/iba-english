import type { AnswerData } from "@/entities/question/types";
import type { PublicTest } from "@/entities/test/types";

export type TestRunnerProps = {
  test: PublicTest;
  answers: Record<string, AnswerData>;
  onAnswer: (questionId: string, answer: AnswerData) => void;
  saveError?: string;
  expiresAt: string | null;
  blockEndsAt?: string | null;
  sectionEnds: Record<string, string | null>;
  partEnds?: Record<string, string | null>;
  questionEnds?: Record<string, string | null>;
  onEnterSection: (sectionId: string) => void;
  onEnterPart?: (partId: string) => void;
  onEnterQuestions?: (questionIds: string[]) => void;
  onSubmit: () => void;
  onExpire: () => void;
  onFocusLossExhausted?: () => void;
  focusLossStorageKey?: string;
  pageStorageKey?: string;
  submitting: boolean;
  submitError?: string;
  attemptToken?: string;
  demoMode?: boolean;
};
