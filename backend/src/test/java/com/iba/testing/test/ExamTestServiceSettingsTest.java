package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.audit.AuditService;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.preset.PresetCatalog;
import com.iba.testing.scale.ScoreScaleService;
import com.iba.testing.question.QuestionRepository;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.section.SectionPartRepository;
import com.iba.testing.section.TestSectionRepository;
import com.iba.testing.template.ExamTemplateService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class ExamTestServiceSettingsTest {

    private final ExamTestService service = new ExamTestService(
            mock(ExamTestRepository.class),
            mock(TestSectionRepository.class),
            mock(SectionPartRepository.class),
            mock(QuestionRepository.class),
            mock(TestVersionRepository.class),
            mock(TestAttemptRepository.class),
            mock(ExamAccess.class),
            mock(TestViews.class),
            mock(PresetCatalog.class),
            mock(ExamTemplateService.class),
            mock(ScoreScaleService.class),
            mock(QuestionEngines.class),
            mock(AuditService.class),
            mock(PlatformService.class),
            new ObjectMapper(),
            mock(TestCopyService.class));

    @Test
    void cleanSettingsDefaultsTimingFlagsOff() {
        ObjectNode raw = new ObjectMapper().createObjectNode();
        raw.put("examType", "IELTS");
        ObjectNode cleaned = service.cleanSettings(raw);
        assertFalse(cleaned.path("autoAdvanceOnPartTimeout").asBoolean(false));
        assertFalse(cleaned.path("pausePartTimerDuringAudio").asBoolean(false));
    }

    @Test
    void cleanSettingsKeepsTimingFlags() {
        ObjectNode raw = new ObjectMapper().createObjectNode();
        raw.put("examType", "TOEFL");
        raw.put("autoAdvanceOnPartTimeout", true);
        raw.put("pausePartTimerDuringAudio", true);
        ObjectNode cleaned = service.cleanSettings(raw);
        assertTrue(cleaned.path("autoAdvanceOnPartTimeout").asBoolean());
        assertTrue(cleaned.path("pausePartTimerDuringAudio").asBoolean());
    }
}