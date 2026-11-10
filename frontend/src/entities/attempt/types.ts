import type { AnswerData, Question } from "@/entities/question/types";
import type { PublicTest } from "@/entities/test/types";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_GRADED" | "NEEDS_REVIEW" | "REVIEWED";

export type AttemptSummary = {
  id: string;
  testId: string;
  testTitle: string;
  participantName: string | null;
  participantEmail?: string | null;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  scaleTotal?: number | null;
  scaleLevel?: string | null;
  resultEmailedAt?: string | null;
  resultReady?: boolean;
};

export type ScaleResultSection = {
  index: number;
  name: string;
  method: "table" | "linear" | "manual" | "tasks";
  min: number;
  max: number;
  step: number;
  testSectionTitle: string | null;
  raw: number | null;
  rawMax: number | null;
  score: number | null;
  pending: boolean;
};

export type ScaleResult = {
  title: string;
  complete: boolean;
  total: number | null;
  level: string | null;
  sections: ScaleResultSection[];
};

export type AnswerMark = "correct" | "wrong" | "empty";

export type ReviewedAnswer = {
  questionId: string;
  marks?: Record<string, AnswerMark>;
  sectionTitle?: string;
  number?: number;
  count?: number;
  question?: Question;
  answerData: AnswerData;
  awardedScore: number | null;
  maxScore: number | null;
  feedback: string;
  needsReview: boolean;
  criterionScores: Record<string, number> | null;
};

export type AttemptDetail = AttemptSummary & {
  answers: ReviewedAnswer[];
  scaleResult?: ScaleResult | null;
};

export type ParticipantExplanationItem = {
  questionId: string;
  number: number;
  count: number;
  correct: boolean | null;
  explanation?: string;
};

export type AnswerCheckResult = {
  checked?: boolean;
  needsReview?: boolean;
  correct?: boolean;
  explanation?: string;
};

export type ParticipantResult = {
  status: AttemptStatus;
  submitted: boolean;
  scoreVisible: boolean;
  score?: number;
  maxScore?: number;
  pendingReview?: boolean;
  resultDetail?: "score_only" | "score_and_review";
  reviewVisible?: boolean;
  explanations?: ParticipantExplanationItem[];
  scale?: ScaleResult;
};

export type StartedAttempt = {
  attemptToken: string;
  status: AttemptStatus;
  expiresAt: string | null;
  blockEndsAt?: string | null;
  test: PublicTest;
};

export type ResumedAttempt = {
  status: AttemptStatus;
  expiresAt: string | null;
  blockEndsAt?: string | null;
  test: PublicTest;
  answers: { questionId: string; answerData: AnswerData }[];
};
