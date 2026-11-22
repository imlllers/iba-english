package com.iba.testing.preset;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.section.MaterialBlock;
import com.iba.testing.section.SectionType;
import com.iba.testing.section.TestSection;
import com.iba.testing.test.ExamTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ToeflQuestionDefaultsTest {

    @Test
    void listeningQuestionHasNoDefaultTime() {
        ExamTest test = mock(ExamTest.class);
        when(test.getExamPreset()).thenReturn("TOEFL");
        TestSection section = mock(TestSection.class);
        when(section.getSectionType()).thenReturn(SectionType.LISTENING);
        Question question = new Question();
        question.setType(QuestionType.SINGLE_CHOICE);
        question.setSettings(ContentNodes.object());

        ToeflQuestionDefaults.apply(test, section, null, null, question);

        assertFalse(question.getSettings().hasNonNull("timeLimitSeconds"));
    }

    @Test
    void listeningLectureBlockHasNoDefaultTime() {
        ExamTest test = mock(ExamTest.class);
        when(test.getExamPreset()).thenReturn("TOEFL");
        TestSection section = mock(TestSection.class);
        when(section.getSectionType()).thenReturn(SectionType.LISTENING);
        MaterialBlock block = mock(MaterialBlock.class);
        when(block.getTitle()).thenReturn("Academic Talk 3");
        Question question = new Question();
        question.setType(QuestionType.SINGLE_CHOICE);
        question.setSettings(ContentNodes.object());

        ToeflQuestionDefaults.apply(test, section, null, block, question);

        assertFalse(question.getSettings().hasNonNull("timeLimitSeconds"));
    }

    @Test
    void listeningKeepsExistingLimit() {
        ExamTest test = mock(ExamTest.class);
        when(test.getExamPreset()).thenReturn("TOEFL");
        TestSection section = mock(TestSection.class);
        when(section.getSectionType()).thenReturn(SectionType.LISTENING);
        Question question = new Question();
        question.setType(QuestionType.SINGLE_CHOICE);
        ObjectNode settings = ContentNodes.object();
        settings.put("timeLimitSeconds", 45);
        question.setSettings(settings);

        ToeflQuestionDefaults.apply(test, section, null, null, question);

        assertEquals(45, question.getSettings().path("timeLimitSeconds").asInt());
    }

    @Test
    void speakingStripsEngineDefaultMaxSeconds() {
        ExamTest test = mock(ExamTest.class);
        when(test.getExamPreset()).thenReturn("TOEFL");
        TestSection section = mock(TestSection.class);
        when(section.getSectionType()).thenReturn(SectionType.SPEAKING);
        Question question = new Question();
        question.setType(QuestionType.SPEAKING_RECORDING);
        ObjectNode settings = ContentNodes.object();
        settings.put("maxSeconds", 120);
        settings.put("preparationSeconds", 0);
        question.setSettings(settings);

        ToeflQuestionDefaults.apply(test, section, null, null, question);

        assertFalse(question.getSettings().hasNonNull("maxSeconds"));
        assertFalse(question.getSettings().hasNonNull("preparationSeconds"));
    }

    @Test
    void speakingKeepsTeacherMaxSeconds() {
        ExamTest test = mock(ExamTest.class);
        when(test.getExamPreset()).thenReturn("TOEFL");
        TestSection section = mock(TestSection.class);
        when(section.getSectionType()).thenReturn(SectionType.SPEAKING);
        Question question = new Question();
        question.setType(QuestionType.SPEAKING_RECORDING);
        ObjectNode settings = ContentNodes.object();
        settings.put("maxSeconds", 45);
        question.setSettings(settings);

        ToeflQuestionDefaults.apply(test, section, null, null, question);

        assertEquals(45, question.getSettings().path("maxSeconds").asInt());
    }
}