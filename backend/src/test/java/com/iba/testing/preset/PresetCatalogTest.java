package com.iba.testing.preset;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PresetCatalogTest {

    private final PresetCatalog catalog = new PresetCatalog();

    @Test
    void ieltsPreset() {
        PresetCatalog.ExamPreset preset = catalog.find("IELTS");
        assertNotNull(preset);
        assertEquals(true, preset.defaultSettings().get("audioAutoStart"));
        assertEquals(4, preset.sections().size());
        assertEquals("LISTENING", preset.sections().get(0).sectionType());
        assertEquals("READING", preset.sections().get(1).sectionType());
        assertEquals("WRITING", preset.sections().get(2).sectionType());
        assertEquals("SPEAKING", preset.sections().get(3).sectionType());
        assertEquals(30, preset.sections().get(0).timeLimitMinutes());
        assertEquals(60, preset.sections().get(1).timeLimitMinutes());
        assertEquals(60, preset.sections().get(2).timeLimitMinutes());
        assertEquals(14, preset.sections().get(3).timeLimitMinutes());
        assertTrue(preset.sections().get(0).allowBackToQuestions());
        assertTrue(preset.sections().get(0).allowBackToPart());
        assertFalse(preset.sections().get(3).allowBackToQuestions());
        assertFalse(preset.sections().get(3).allowBackToPart());
        assertFalse(preset.defaultSettings().containsKey("autoAdvanceOnPartTimeout"));
    }

    @Test
    void toeflPreset() {
        PresetCatalog.ExamPreset preset = catalog.find("TOEFL");
        assertNotNull(preset);
        assertEquals("TOEFL iBT (2026)", preset.title());
        assertEquals("part", preset.defaultSettings().get("questionNumberScope"));
        assertFalse(preset.defaultSettings().containsKey("listeningAnswerSeconds"));
        assertEquals(true, preset.defaultSettings().get("autoAdvanceOnPartTimeout"));
        assertEquals(false, preset.defaultSettings().get("pausePartTimerDuringAudio"));
        assertEquals("score_and_scale", preset.defaultSettings().get("resultDetail"));
        assertNull(preset.defaultSettings().get("focusLossMaxWarnings"));
        assertNull(preset.sections().get(0).timeLimitMinutes());
        assertEquals(2, preset.sections().get(0).parts().size());
        assertNull(preset.sections().get(0).parts().get(0).timeLimitMinutes());
        assertNull(preset.sections().get(0).parts().get(1).timeLimitMinutes());
        assertNull(preset.sections().get(0).parts().get(0).autoAdvanceOnTimeout());
        assertNull(preset.sections().get(1).timeLimitMinutes());
        assertNull(preset.sections().get(2).timeLimitMinutes());
        assertEquals(3, preset.sections().get(2).parts().size());
        assertNull(preset.sections().get(2).parts().get(0).timeLimitMinutes());
        assertNull(preset.sections().get(2).parts().get(1).timeLimitMinutes());
        assertNull(preset.sections().get(2).parts().get(2).timeLimitMinutes());
        assertNull(preset.sections().get(3).timeLimitMinutes());
        assertTrue(preset.sections().get(3).speakingAutoFlow());
        assertFalse(preset.sections().get(1).allowBackToQuestions());
    }

    @Test
    void toeflLegacyPresetIsGone() {
        assertNull(catalog.find("TOEFL_LEGACY"));
        assertEquals(4, catalog.all().size());
    }

    @Test
    void toeicListeningReadingPreset() {
        PresetCatalog.ExamPreset preset = catalog.find("TOEIC");
        assertNotNull(preset);
        assertEquals("TOEIC Listening & Reading", preset.title());
        assertEquals("TOEIC", preset.family());
        assertEquals(2, preset.sections().size());
        assertEquals("LISTENING", preset.sections().get(0).sectionType());
        assertEquals("READING", preset.sections().get(1).sectionType());
        assertEquals(45, preset.sections().get(0).timeLimitMinutes());
        assertEquals(75, preset.sections().get(1).timeLimitMinutes());
        assertFalse(preset.sections().get(0).allowBackToQuestions());
        assertFalse(preset.sections().get(0).allowBackToPart());
        assertTrue(preset.sections().get(1).allowBackToQuestions());
        assertTrue(preset.sections().get(1).allowBackToPart());
        assertEquals(4, preset.sections().get(0).parts().size());
        assertTrue(preset.sections().get(0).parts().get(0).oneQuestionPerPage());
        assertTrue(preset.sections().get(0).parts().get(1).oneQuestionPerPage());
        assertFalse(preset.sections().get(0).parts().get(2).oneQuestionPerPage());
        assertFalse(preset.sections().get(0).parts().get(3).oneQuestionPerPage());
        assertEquals("score_and_scale", preset.defaultSettings().get("resultDetail"));
        assertFalse(preset.defaultSettings().containsKey("autoAdvanceOnPartTimeout"));
        assertFalse(preset.defaultSettings().containsKey("pausePartTimerDuringAudio"));
    }

    @Test
    void toeicSpeakingWritingPreset() {
        PresetCatalog.ExamPreset preset = catalog.find("TOEIC_SW");
        assertNotNull(preset);
        assertEquals("TOEIC Speaking & Writing", preset.title());
        assertEquals("TOEIC", preset.family());
        assertEquals(2, preset.sections().size());
        assertEquals("SPEAKING", preset.sections().get(0).sectionType());
        assertEquals("WRITING", preset.sections().get(1).sectionType());
        assertEquals(20, preset.sections().get(0).timeLimitMinutes());
        assertEquals(60, preset.sections().get(1).timeLimitMinutes());
        assertTrue(preset.sections().get(0).parts().isEmpty());
        assertTrue(preset.sections().get(1).parts().isEmpty());
        assertFalse(preset.sections().get(0).allowBackToQuestions());
        assertFalse(preset.sections().get(1).allowBackToQuestions());
        assertEquals("score_and_scale", preset.defaultSettings().get("resultDetail"));
        assertEquals("TOEIC", preset.defaultSettings().get("examType"));
    }
}