import type {
  ErrorExplanationMode,
  ExamDisplayType,
  QuestionNumberFormat,
  QuestionNumberScope,
  ResultDetail,
  TestSettings,
} from "./types";

export const QUESTION_NUMBER_FORMATS: QuestionNumberFormat[] = [
  "1",
  "1.",
  "1)",
  "(1)",
  "Q1",
  "Question 1",
];

export const QUESTION_NUMBER_SCOPES: QuestionNumberScope[] = ["test", "section", "part"];

export const EXAM_DISPLAY_TYPES: ExamDisplayType[] = ["CUSTOM", "IELTS", "TOEFL", "TOEIC"];

export const ERROR_EXPLANATION_MODES: ErrorExplanationMode[] = ["off", "during", "after", "both"];

export function normalizeErrorExplanationMode(raw: unknown): ErrorExplanationMode {
  return ERROR_EXPLANATION_MODES.includes(raw as ErrorExplanationMode)
    ? (raw as ErrorExplanationMode)
    : "off";
}

export function normalizeQuestionNumberFormat(raw: unknown): QuestionNumberFormat {
  return QUESTION_NUMBER_FORMATS.includes(raw as QuestionNumberFormat)
    ? (raw as QuestionNumberFormat)
    : "1";
}

export function normalizeQuestionNumberScope(raw: unknown): QuestionNumberScope {
  return QUESTION_NUMBER_SCOPES.includes(raw as QuestionNumberScope)
    ? (raw as QuestionNumberScope)
    : "test";
}

export const ACCESS_DATES_ENABLED = false;

export const RESULT_DISPLAY_ENABLED = false;

export const RESULT_REVIEW_ENABLED = false;

export const ERROR_EXPLANATIONS_ENABLED = false;

export const DISABLED_EXAM_TYPES: ReadonlySet<ExamDisplayType> = new Set<ExamDisplayType>(["TOEIC", "TOEFL"]);
export const isExamTypeDisabled = (type: string | null | undefined) => DISABLED_EXAM_TYPES.has(type as ExamDisplayType);
export const DISABLED_SUFFIX = " – временно недоступен";

export const EXAM_TYPE_OPTIONS: { value: ExamDisplayType; label: string; disabled?: boolean }[] = (
  [
    { value: "CUSTOM", label: "Пользовательский" },
    { value: "IELTS", label: "IELTS" },
    { value: "TOEFL", label: "TOEFL" },
    { value: "TOEIC", label: "TOEIC" },
  ] as { value: ExamDisplayType; label: string }[]
).map((option) => (isExamTypeDisabled(option.value)
  ? { ...option, label: option.label + DISABLED_SUFFIX, disabled: true }
  : option));

export function normalizeExamDisplayType(raw: unknown, examPreset?: string | null): ExamDisplayType {
  if (EXAM_DISPLAY_TYPES.includes(raw as ExamDisplayType)) {
    return raw as ExamDisplayType;
  }
  if (raw === "" || raw == null) {
    if (examPreset === "IELTS" || examPreset === "TOEFL" || examPreset === "TOEIC") {
      return examPreset;
    }
  }
  return "CUSTOM";
}

export function normalizeTestSettings(
  raw: Partial<TestSettings> | null | undefined,
  examPreset?: string | null,
): TestSettings {
  const source = raw ?? {};
  const detail = source.resultDetail;
  const resultDetail: ResultDetail =
    detail === "score_and_review" ? "score_and_review" : "score_only";
  const focus = source.focusLossMaxWarnings;
  const attempts = source.maxAttempts;
  return {
    requireParticipantName: true,
    requireParticipantEmail: source.requireParticipantEmail !== false,
    allowBackToQuestions: source.allowBackToQuestions !== false,
    allowBackToPart: source.allowBackToPart !== false,
    allowBackToSection: source.allowBackToSection !== false,
    shuffleChoices: Boolean(source.shuffleChoices),
    focusLossMaxWarnings: typeof focus === "number" && focus > 0 ? focus : null,
    audioAutoStart: Boolean(source.audioAutoStart),
    questionNumberFormat: normalizeQuestionNumberFormat(source.questionNumberFormat),
    questionNumberScope: normalizeQuestionNumberScope(source.questionNumberScope),
    examType: normalizeExamDisplayType(source.examType, examPreset),
    oneQuestionPerPage: source.oneQuestionPerPage !== false,
    errorExplanationMode: normalizeErrorExplanationMode(source.errorExplanationMode),
    showResultToParticipant: source.showResultToParticipant !== false,
    resultDetail,
    maxAttempts: typeof attempts === "number" && attempts > 0 ? attempts : null,
    timeLimitMinutes: typeof source.timeLimitMinutes === "number" && source.timeLimitMinutes > 0
      ? source.timeLimitMinutes
      : null,
    timeLimitSectionTypes: source.timeLimitSectionTypes ?? null,
    allowEarlySubmit: source.allowEarlySubmit !== false,
    autoAdvanceOnQuestionTimeout: Boolean(source.autoAdvanceOnQuestionTimeout),
    listeningAnswerSeconds: typeof source.listeningAnswerSeconds === "number" && source.listeningAnswerSeconds > 0
      ? source.listeningAnswerSeconds
      : null,
    availableFrom: source.availableFrom ?? null,
    availableUntil: source.availableUntil ?? null,
    showLevelToParticipant: source.showLevelToParticipant !== false,
    emailResultToParticipant: Boolean(source.emailResultToParticipant),
    scoreScale: source.scoreScale && typeof source.scoreScale === "object" && source.scoreScale.scale ? source.scoreScale : null,
  };
}

export function withNormalizedSettings<T extends { settings?: Partial<TestSettings> | null; examPreset?: string | null }>(
  test: T,
): T & { settings: TestSettings } {
  return { ...test, settings: normalizeTestSettings(test.settings, test.examPreset) };
}
