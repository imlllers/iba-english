package com.iba.testing.preset;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.section.MaterialBlock;
import com.iba.testing.section.SectionPart;
import com.iba.testing.section.TestSection;
import com.iba.testing.test.ExamTest;

import java.util.Locale;

public final class ToeflQuestionDefaults {

    private ToeflQuestionDefaults() {
    }

    public static void apply(ExamTest test, TestSection section, SectionPart part, MaterialBlock block, Question question) {
        String preset = test.getExamPreset();
        if (!"TOEFL".equals(preset)) {
            return;
        }
        ObjectNode settings = question.getSettings().isObject()
                ? (ObjectNode) question.getSettings().deepCopy()
                : ContentNodes.object();
        if (question.getType() == QuestionType.SPEAKING_RECORDING) {
            stripSpeakingEngineTimes(settings);
        }
        if (question.getType() == QuestionType.SHORT_WRITTEN && part != null
                && part.getTitle() != null && part.getTitle().toLowerCase(Locale.ROOT).contains("discussion")) {
            int min = settings.path("minWords").asInt(0);
            if (min <= 0) {
                settings.put("minWords", 100);
            }
        }
        question.setSettings(settings);
    }

    private static void stripSpeakingEngineTimes(ObjectNode settings) {
        JsonNode max = settings.get("maxSeconds");
        if (max != null && max.isInt() && max.asInt() == 120) {
            settings.remove("maxSeconds");
        }
        JsonNode prep = settings.get("preparationSeconds");
        if (prep != null && prep.isInt() && (prep.asInt() == 0 || prep.asInt() == 30)) {
            settings.remove("preparationSeconds");
        }
        JsonNode reading = settings.get("readingSeconds");
        if (reading == null || reading.isNull() || (reading.isInt() && reading.asInt() <= 0)) {
            settings.remove("readingSeconds");
        }
    }
}