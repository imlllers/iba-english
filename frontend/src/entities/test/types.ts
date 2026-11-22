import type { ScoreScale } from "@/entities/scale/types";
import type { ContentItem, Doc, PublicQuestion, Question } from "@/entities/question/types";

export type TestStatus = "DRAFT" | "PUBLISHED";
export type AccessStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";
export type SectionType = "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "CUSTOM";

export type ResultDetail = "score_only" | "sections_only" | "score_and_scale";

export type ErrorExplanationMode = "off" | "during" | "after" | "both";

export type QuestionNumberFormat = "1" | "1." | "1)" | "(1)" | "Q1" | "Question 1";

export type QuestionNumberScope = "test" | "section" | "part";

export type ExamDisplayType = "CUSTOM" | "IELTS" | "TOEFL" | "TOEIC";

export type TestSettings = {
  requireParticipantName: boolean;
  requireParticipantEmail: boolean;
  allowBackToQuestions: boolean;
  allowBackToPart: boolean;
  allowBackToSection: boolean;
  shuffleChoices: boolean;
  focusLossMaxWarnings: number | null;
  audioAutoStart: boolean;
  videoAutoStart: boolean;
  questionNumberFormat: QuestionNumberFormat;
  questionNumberScope: QuestionNumberScope;
  examType: ExamDisplayType;
  oneQuestionPerPage: boolean;
  errorExplanationMode: ErrorExplanationMode;
  showResultToParticipant: boolean;
  resultDetail: ResultDetail;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  timeLimitSectionTypes?: SectionType[] | null;
  allowEarlySubmit?: boolean;
  autoAdvanceOnQuestionTimeout?: boolean;
  autoAdvanceOnPartTimeout?: boolean;
  pausePartTimerDuringAudio?: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  emailResultToParticipant: boolean;
  scoreScale: TestScoreScale | null;
};

export type ScaleSectionBinding = { sectionId?: string | null; sectionIndex?: number | null };

export type TestScoreScale = {
  sourceId: string;
  scale: ScoreScale;
  sections: ScaleSectionBinding[];
};

export type SectionPart = {
  id: string;
  title: string;
  instructions: string;
  items?: ContentItem[];
  timeLimitMinutes?: number | null;
  timeLimitSeconds?: number | null;
  oneQuestionPerPage?: boolean | null;
  autoAdvanceOnTimeout?: boolean | null;
  orderIndex: number;
};

export type MaterialBlock = {
  id: string;
  partId?: string | null;
  title: string;
  instructions: string;
  content: Doc;
  items?: ContentItem[];
  mediaId?: string | null;
  mediaKind?: "image" | "audio" | null;
  orderIndex: number;
};

export type Section = {
  id: string;
  title: string;
  instructions: string;
  items?: ContentItem[];
  orderIndex: number;
  sectionType: SectionType;
  timeLimitMinutes: number | null;
  timeLimitSeconds?: number | null;
  allowBackToQuestions?: boolean | null;
  allowBackToPart?: boolean | null;
  speakingAutoFlow?: boolean | null;
  parts?: SectionPart[];
  materialBlocks?: MaterialBlock[];
  questions: Question[];
};

export type TestSummary = {
  id: string;
  title: string;
  examPreset: string | null;
  status: TestStatus;
  questionCount: number;
  updatedAt: string;
  publishedAt?: string | null;
  publicToken: string | null;
  publicTokenExpiresAt?: string | null;
  accessStatus?: AccessStatus;
  hasUnpublishedChanges?: boolean;
  ownerEmail?: string;
  ownerName?: string;
  sharedFromName?: string;
};

export type ExamTest = TestSummary & {
  description: string;
  settings: TestSettings;
  publishedVersion: number;
  hasUnpublishedChanges: boolean;
  sections: Section[];
};

export type PresetSectionSkeleton = {
  title: string;
  sectionType: SectionType;
  timeLimitMinutes: number | null;
  timeLimitSeconds?: number | null;
  instructions: string;
  allowBackToQuestions?: boolean | null;
  allowBackToPart?: boolean | null;
  parts?: { title: string; oneQuestionPerPage?: boolean | null }[];
};

export type Preset = {
  id: string;
  title: string;
  family: string;
  sections: PresetSectionSkeleton[];
  defaultSettings?: Partial<TestSettings>;
};

export type ExamTemplateFamily = ExamDisplayType;

export type ExamTemplate = {
  id: string;
  title: string;
  family: ExamTemplateFamily;
  builtinKey: string | null;
  builtin: boolean;
  sections: PresetSectionSkeleton[];
  defaultSettings: Partial<TestSettings>;
  createdAt: string;
  updatedAt: string;
};

export type PublicSection = Omit<Section, "questions"> & { questions: PublicQuestion[] };

export type PublicTestSettings = Partial<TestSettings>;

export type PublicTest = {
  title: string;
  description: string;
  settings: PublicTestSettings;
  sections: PublicSection[];
};
