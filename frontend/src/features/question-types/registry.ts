import type { Engine, QuestionType } from "@/entities/question/types";

export type TypeGroup = "choice" | "gaps" | "text" | "grammar" | "production";

type TypeMeta = { label: string; group: TypeGroup; engine: Engine; hint: string };

const TYPE_ALIASES: Record<string, QuestionType> = {
  FILL_BLANKS: "GAPPED_TEXT",
  TABLE_COMPLETION: "GAPPED_TEXT",
  FORM_COMPLETION: "GAPPED_TEXT",
  NOTE_COMPLETION: "GAPPED_TEXT",
  MISSING_LETTERS: "GAPPED_TEXT",
  DROPDOWN_GAPS: "GAPPED_TEXT",
  WORD_BANK_GAPS: "GAPPED_TEXT",
  DRAG_DROP_GAPS: "GAPPED_TEXT",
  PARAGRAPH_INSERTION: "GAPPED_TEXT",
  SENTENCE_INSERTION: "MATCHING",
  LOCATE_IN_TEXT: "MATCHING",
  CLASSIFICATION: "MATCHING",
  SENTENCE_TRANSFORM: "SHORT_ANSWER",
  PARAPHRASE: "SHORT_ANSWER",
  ERROR_CORRECTION: "SHORT_ANSWER",
  ESSAY: "SHORT_WRITTEN",
  HIGHLIGHT_TEXT: "MATCHING",
  FIND_ERRORS: "TEXT_ERRORS",
  FRAGMENT_CHOICE: "SINGLE_CHOICE",
  HEADING_CHOICE: "SINGLE_CHOICE",
  NUMERIC_ANSWER: "SHORT_ANSWER",
  MATCH_ENDINGS: "MATCHING",
  MATCH_QA: "MATCHING",
  MATCH_SPEAKERS: "MATCHING",
  MATCH_HEADINGS: "MATCHING",
  MATCH_DESCRIPTIONS: "MATCHING",
  MATCH_AUDIO: "MATCHING",
  ORDER_PARAGRAPHS: "ORDER_SENTENCES",
  BUILD_SENTENCE: "ORDER_SENTENCES",
};

export const TYPE_META: Record<QuestionType, TypeMeta> = {
  SINGLE_CHOICE: { label: "Один вариант ответа", group: "choice", engine: "CHOICE", hint: "Участник выбирает один верный пункт из списка" },
  MULTIPLE_SELECT: { label: "Несколько вариантов ответа", group: "choice", engine: "MULTI_CHOICE", hint: "Несколько верных пунктов; в IELTS каждый даёт свой номер вопроса" },
  TRUE_FALSE: { label: "True / False", group: "choice", engine: "JUDGEMENT", hint: "По каждому утверждению: верно или неверно" },
  YES_NO: { label: "Yes / No", group: "choice", engine: "JUDGEMENT", hint: "По каждому утверждению: да или нет" },
  TRUE_FALSE_NOT_GIVEN: { label: "True / False / Not Given", group: "choice", engine: "JUDGEMENT", hint: "По каждому утверждению: верно, неверно или в тексте нет информации" },
  YES_NO_NOT_GIVEN: { label: "Yes / No / Not Given", group: "choice", engine: "JUDGEMENT", hint: "По каждому утверждению: да, нет или в тексте нет информации" },
  SENTENCE_GAPS: { label: "Заполнить пропуск", group: "gaps", engine: "INLINE", hint: "Каждая строка – отдельное задание; в пропуск вписать, дописать или выбрать вариант" },
  GAPPED_TEXT: { label: "Заполнить пропуски в общем тексте", group: "gaps", engine: "INLINE", hint: "Несколько пропусков в одном связном тексте: вписать, дописать или выбрать вариант" },
  SHORT_ANSWER: { label: "Короткий текстовый ответ", group: "gaps", engine: "TEXT_ANSWER", hint: "Слово, фраза, число, дата или время; проверка по ключу" },
  MATCHING: { label: "Сопоставление", group: "text", engine: "MATCHING", hint: "Сопоставить элементы двух колонок; справа можно оставить лишние" },
  ORDER_SENTENCES: {
    label: "Порядок",
    group: "text",
    engine: "ORDERING",
    hint: "Переставить список или собрать предложение из банка со слотами; можно добавить лишние слова и текст до/после",
  },
  SENTENCE_ERRORS: { label: "Исправить ошибку", group: "text", engine: "ERROR_HUNT", hint: "Каждая строка – отдельное задание; отметить ошибочное слово и вписать исправление" },
  TEXT_ERRORS: { label: "Исправление ошибок в общем тексте", group: "text", engine: "ERROR_HUNT", hint: "В связном тексте отметить ошибочные слова и вписать исправления" },
  WORD_TRANSFORM: { label: "Образуйте слово", group: "grammar", engine: "TRANSFORM", hint: "Из основы (CONSTRUCT) образовать форму для пропуска (construction)" },
  SHORT_WRITTEN: { label: "Развернутый текстовый ответ", group: "production", engine: "WRITTEN", hint: "Связный текст с лимитом слов; проверяет преподаватель" },
  SPEAKING_RECORDING: { label: "Устный ответ", group: "production", engine: "SPEAKING", hint: "Запись голоса с лимитом времени; проверяет преподаватель" },
};

export const GROUPS: { id: TypeGroup; label: string }[] = [
  { id: "choice", label: "Выбор ответа" },
  { id: "gaps", label: "Заполнение пропусков" },
  { id: "text", label: "Структура и сопоставление" },
  { id: "grammar", label: "Грамматика и лексика" },
  { id: "production", label: "Письменные и устные ответы" },
];

export const QUESTION_TYPES = Object.keys(TYPE_META) as QuestionType[];

export const DISABLED_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>(["SPEAKING_RECORDING"]);

export const ANSWER_CATALOG: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "SHORT_ANSWER",
  "SHORT_WRITTEN",
  "TRUE_FALSE",
  "YES_NO",
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
  "SENTENCE_ERRORS",
  "SENTENCE_GAPS",
  "MATCHING",
  "SPEAKING_RECORDING",
  "ORDER_SENTENCES",
];

export const INLINE_CATALOG: QuestionType[] = [
  "GAPPED_TEXT",
  "TEXT_ERRORS",
];

export function canonicalizeQuestionType(type: string): QuestionType {
  return (TYPE_ALIASES[type] ?? type) as QuestionType;
}

export function typesOf(group: TypeGroup) {
  return QUESTION_TYPES.filter((type) => TYPE_META[type].group === group);
}

export function engineOf(type: QuestionType): Engine {
  return TYPE_META[canonicalizeQuestionType(type)].engine;
}

export function typeLabel(type: QuestionType) {
  return TYPE_META[canonicalizeQuestionType(type)]?.label ?? type;
}

export function judgementLabels(type: QuestionType) {
  if (type === "TRUE_FALSE") {
    return ["TRUE", "FALSE"];
  }
  if (type === "YES_NO") {
    return ["YES", "NO"];
  }
  if (type === "YES_NO_NOT_GIVEN") {
    return ["YES", "NO", "NOT_GIVEN"];
  }
  return ["TRUE", "FALSE", "NOT_GIVEN"];
}

export function judgementText(label: string) {
  return label === "NOT_GIVEN" ? "Not Given" : label.charAt(0) + label.slice(1).toLowerCase();
}
