export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "TRUE_FALSE"
  | "YES_NO"
  | "TRUE_FALSE_NOT_GIVEN"
  | "YES_NO_NOT_GIVEN"
  | "SENTENCE_GAPS"
  | "GAPPED_TEXT"
  | "SHORT_ANSWER"
  | "MATCHING"
  | "ORDER_SENTENCES"
  | "SENTENCE_ERRORS"
  | "TEXT_ERRORS"
  | "WORD_TRANSFORM"
  | "SHORT_WRITTEN"
  | "SPEAKING_RECORDING";

export type Engine =
  | "CHOICE"
  | "MULTI_CHOICE"
  | "JUDGEMENT"
  | "TEXT_ANSWER"
  | "TRANSFORM"
  | "MATCHING"
  | "ORDERING"
  | "ERROR_HUNT"
  | "WRITTEN"
  | "SPEAKING"
  | "INLINE";

export type DocMark = { type: string; attrs?: Record<string, unknown> };

export type DocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: DocMark[];
  content?: DocNode[];
};

export type Doc = { type: "doc"; content?: DocNode[] };

export type Item = { id: string; text: string };
export type MediaItem = Item & { mediaId?: string };

export type TextRule = {
  accepted?: string[];
  caseInsensitive?: boolean;
  normalizeSpaces?: boolean;
  mode?: TextAnswerMode;
  number?: number;
  tolerance?: number;
  time?: string;
};

export type Criterion = { id: string; label: string; maxPoints: number };

export type ContentKind = "text" | "audio" | "video" | "image";

export type ContentItem = { id: string; kind: ContentKind; doc?: Doc; mediaId?: string };

export type QuestionSettings = {
  content?: ContentItem[];
  instructions?: string | Doc;
  errorExplanation?: string;
  selectCount?: number;
  timeLimitSeconds?: number | null;
  mediaId?: string;
  mediaKind?: "audio" | "image";
  playbackLimit?: number;
  reviewIfNoMatch?: boolean;
  criteria?: Criterion[];
  minWords?: number;
  maxWords?: number;
  maxSeconds?: number;
  preparationSeconds?: number;
};

export type Question = {
  id: string;
  partId?: string | null;
  materialBlockId?: string | null;
  type: QuestionType;
  promptContent: Doc;
  options: unknown;
  answerKey: Record<string, unknown>;
  scoringConfig: Record<string, unknown>;
  orderIndex: number;
  required: boolean;
  settings: QuestionSettings;
};

export type PublicQuestion = Omit<Question, "answerKey"> & { answerKey?: never };

export type AnswerData = Record<string, unknown>;

export type JudgementOptions = { statements: Item[] };
export type BlankKind = "gap" | "tail" | "dropdown";
export type InlineOptions = {
  choices?: Record<string, Item[]>;
  prefixes?: Record<string, string>;
  tailLengths?: Record<string, number>;
};
export type TransformOptions = { source?: string; keyword?: string };
export type MatchingOptions = {
  leftTitle?: string;
  rightTitle?: string;
  left?: MediaItem[];
  right?: Item[];
  allowReuse?: boolean;
};
export type OrderingOptions = {
  items?: Item[];
  distractors?: Item[];
  prefix?: string;
  suffix?: string;
  joiner?: string;
  presentation?: "list" | "slots";
};
export type SegmentUnit = "WORD" | "SENTENCE";
export type SegmentOptions = { text?: string; unit?: SegmentUnit; segments?: Item[] };

export type TextAnswerMode = "TEXT" | "NUMBER" | "DATE" | "TIME";
export type TextAnswerKey = TextRule;
