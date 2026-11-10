package com.iba.testing.question;

import com.iba.testing.question.engine.Engine;

import java.util.List;
import java.util.Map;

public enum QuestionType {
    SINGLE_CHOICE(Engine.CHOICE, "Один вариант ответа"),
    MULTIPLE_SELECT(Engine.MULTI_CHOICE, "Несколько вариантов ответа"),
    TRUE_FALSE(Engine.JUDGEMENT, "True / False"),
    YES_NO(Engine.JUDGEMENT, "Yes / No"),
    TRUE_FALSE_NOT_GIVEN(Engine.JUDGEMENT, "True / False / Not Given"),
    YES_NO_NOT_GIVEN(Engine.JUDGEMENT, "Yes / No / Not Given"),
    SENTENCE_GAPS(Engine.INLINE, "Заполнить пропуск"),
    GAPPED_TEXT(Engine.INLINE, "Заполнить пропуски в общем тексте"),
    SHORT_ANSWER(Engine.TEXT_ANSWER, "Короткий текстовый ответ"),
    MATCHING(Engine.MATCHING, "Сопоставление"),
    ORDER_SENTENCES(Engine.ORDERING, "Порядок"),
    SENTENCE_ERRORS(Engine.ERROR_HUNT, "Исправить ошибку"),
    TEXT_ERRORS(Engine.ERROR_HUNT, "Исправление ошибок в общем тексте"),
    WORD_TRANSFORM(Engine.TRANSFORM, "Образуйте слово"),
    SHORT_WRITTEN(Engine.WRITTEN, "Развернутый текстовый ответ"),
    SPEAKING_RECORDING(Engine.SPEAKING, "Устный ответ");

    private static final Map<String, QuestionType> ALIASES = Map.ofEntries(
            Map.entry("FILL_BLANKS", GAPPED_TEXT),
            Map.entry("TABLE_COMPLETION", GAPPED_TEXT),
            Map.entry("FORM_COMPLETION", GAPPED_TEXT),
            Map.entry("NOTE_COMPLETION", GAPPED_TEXT),
            Map.entry("MISSING_LETTERS", GAPPED_TEXT),
            Map.entry("DROPDOWN_GAPS", GAPPED_TEXT),
            Map.entry("WORD_BANK_GAPS", GAPPED_TEXT),
            Map.entry("DRAG_DROP_GAPS", GAPPED_TEXT),
            Map.entry("PARAGRAPH_INSERTION", GAPPED_TEXT),
            Map.entry("SENTENCE_INSERTION", MATCHING),
            Map.entry("LOCATE_IN_TEXT", MATCHING),
            Map.entry("CLASSIFICATION", MATCHING),
            Map.entry("SENTENCE_TRANSFORM", SHORT_ANSWER),
            Map.entry("PARAPHRASE", SHORT_ANSWER),
            Map.entry("ERROR_CORRECTION", SHORT_ANSWER),
            Map.entry("ESSAY", SHORT_WRITTEN),
            Map.entry("HIGHLIGHT_TEXT", MATCHING),
            Map.entry("FIND_ERRORS", TEXT_ERRORS),
            Map.entry("FRAGMENT_CHOICE", SINGLE_CHOICE),
            Map.entry("HEADING_CHOICE", SINGLE_CHOICE),
            Map.entry("NUMERIC_ANSWER", SHORT_ANSWER),
            Map.entry("MATCH_ENDINGS", MATCHING),
            Map.entry("MATCH_QA", MATCHING),
            Map.entry("MATCH_SPEAKERS", MATCHING),
            Map.entry("MATCH_HEADINGS", MATCHING),
            Map.entry("MATCH_DESCRIPTIONS", MATCHING),
            Map.entry("MATCH_AUDIO", MATCHING),
            Map.entry("ORDER_PARAGRAPHS", ORDER_SENTENCES),
            Map.entry("BUILD_SENTENCE", ORDER_SENTENCES)
    );

    private final Engine engine;
    private final String label;

    QuestionType(Engine engine, String label) {
        this.engine = engine;
        this.label = label;
    }

    public Engine engine() {
        return engine;
    }

    public String label() {
        return label;
    }

    public static QuestionType canonicalize(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("empty type");
        }
        QuestionType alias = ALIASES.get(name);
        if (alias != null) {
            return alias;
        }
        return QuestionType.valueOf(name);
    }

    public List<String> judgementLabels() {
        return switch (this) {
            case TRUE_FALSE -> List.of("TRUE", "FALSE");
            case YES_NO -> List.of("YES", "NO");
            case YES_NO_NOT_GIVEN -> List.of("YES", "NO", "NOT_GIVEN");
            default -> List.of("TRUE", "FALSE", "NOT_GIVEN");
        };
    }
}
