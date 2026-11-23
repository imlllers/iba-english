package com.iba.testing.preset;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class PresetCatalog {

    public List<ExamPreset> all() {
        return List.of(ielts(), toefl(), toeic(), toeicSw());
    }

    public ExamPreset find(String id) {
        return all().stream().filter(preset -> preset.id().equals(id)).findFirst().orElse(null);
    }

    private ExamPreset ielts() {
        Map<String, Object> settings = baseSettings("IELTS", "section", false, true, true, false, true, true);
        settings.put("showResultToParticipant", true);
        settings.put("resultDetail", "score_and_scale");
        settings.put("focusLossMaxWarnings", 2);
        settings.put("allowEarlySubmit", true);
        settings.put("requireParticipantName", true);
        settings.put("requireParticipantEmail", true);
        return new ExamPreset(
                "IELTS",
                "IELTS",
                "IELTS",
                List.of(
                        section("Listening", "LISTENING", 30, true, true,
                                parts(null, "Part 1", "Part 2", "Part 3", "Part 4")),
                        section("Reading", "READING", 60, true, true,
                                parts(null, "Passage 1", "Passage 2", "Passage 3")),
                        section("Writing", "WRITING", 60, true, true,
                                parts(null, "Task 1", "Task 2")),
                        section("Speaking", "SPEAKING", 14, false, false,
                                parts(null, "Part 1", "Part 2", "Part 3"))),
                settings);
    }

    private ExamPreset toefl() {
        Map<String, Object> settings = baseSettings("TOEFL", "part", true, false, false, false, true, true);
        settings.put("showResultToParticipant", true);
        settings.put("resultDetail", "score_and_scale");
        settings.put("focusLossMaxWarnings", null);
        settings.put("allowEarlySubmit", false);
        settings.put("autoAdvanceOnQuestionTimeout", true);
        settings.put("autoAdvanceOnPartTimeout", true);
        settings.put("pausePartTimerDuringAudio", false);
        settings.put("questionNumberFormat", "1.");
        settings.put("requireParticipantName", true);
        settings.put("requireParticipantEmail", true);
        return new ExamPreset(
                "TOEFL",
                "TOEFL iBT (2026)",
                "TOEFL",
                List.of(
                        section("Reading Section", "READING", null, true, false,
                                List.of(
                                        part("Module 1", null),
                                        part("Module 2", null)),
                                null),
                        section("Listening Section", "LISTENING", null, false, false, List.of(), null),
                        section("Writing Section", "WRITING", null, false, false, List.of(
                                part("Build a Sentence", null),
                                part("Write an Email", null),
                                part("Academic Discussion", null)), null),
                        section("Speaking Section", "SPEAKING", null, false, false, List.of(), true)),
                settings);
    }

    private ExamPreset toeic() {
        Map<String, Object> settings = toeicBaseSettings();
        return new ExamPreset(
                "TOEIC",
                "TOEIC Listening & Reading",
                "TOEIC",
                List.of(
                        section("Listening Section", "LISTENING", 45, false, false, List.of(
                                part("Part 1: Photographs", true),
                                part("Part 2: Question-Response", true),
                                part("Part 3: Conversations", false),
                                part("Part 4: Talks", false))),
                        section("Reading Section", "READING", 75, true, true, List.of(
                                part("Part 5: Incomplete Sentences", true),
                                part("Part 6: Text Completion", false),
                                part("Part 7: Reading Comprehension", false)))),
                settings);
    }

    private ExamPreset toeicSw() {
        Map<String, Object> settings = toeicBaseSettings();
        return new ExamPreset(
                "TOEIC_SW",
                "TOEIC Speaking & Writing",
                "TOEIC",
                List.of(
                        section("Speaking Section", "SPEAKING", 20, false, false, List.of()),
                        section("Writing Section", "WRITING", 60, false, false, List.of())),
                settings);
    }

    private Map<String, Object> toeicBaseSettings() {
        Map<String, Object> settings = baseSettings("TOEIC", "test", true, true, true, false, true, true);
        settings.put("showResultToParticipant", true);
        settings.put("resultDetail", "score_and_scale");
        settings.put("focusLossMaxWarnings", 2);
        settings.put("allowEarlySubmit", true);
        settings.put("requireParticipantName", true);
        settings.put("requireParticipantEmail", true);
        return settings;
    }

    private PresetSection section(
            String title,
            String type,
            Integer minutes,
            Boolean allowBackToQuestions,
            Boolean allowBackToPart,
            List<PresetPart> parts) {
        return section(title, type, minutes, allowBackToQuestions, allowBackToPart, parts, null);
    }

    private PresetSection section(
            String title,
            String type,
            Integer minutes,
            Boolean allowBackToQuestions,
            Boolean allowBackToPart,
            List<PresetPart> parts,
            Boolean speakingAutoFlow) {
        return new PresetSection(title, type, minutes, "", allowBackToQuestions, allowBackToPart, parts, speakingAutoFlow);
    }

    private List<PresetPart> parts(Boolean oneQuestionPerPage, String... titles) {
        return java.util.Arrays.stream(titles).map(title -> part(title, oneQuestionPerPage)).toList();
    }

    private PresetPart part(String title, Boolean oneQuestionPerPage) {
        return new PresetPart(title, oneQuestionPerPage, null, null, null);
    }

    private PresetPart timedPart(String title, Boolean oneQuestionPerPage, Integer timeLimitMinutes, Integer timeLimitSeconds) {
        boolean timed = (timeLimitMinutes != null && timeLimitMinutes > 0)
                || (timeLimitSeconds != null && timeLimitSeconds > 0);
        return new PresetPart(
                title,
                oneQuestionPerPage,
                timeLimitMinutes,
                timeLimitSeconds,
                timed ? Boolean.TRUE : null);
    }

    private Map<String, Object> baseSettings(
            String examType,
            String numberScope,
            boolean oneQuestionPerPage,
            boolean allowBackToQuestions,
            boolean allowBackToPart,
            boolean allowBackToSection,
            boolean audioAutoStart,
            boolean videoAutoStart) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("examType", examType);
        map.put("questionNumberScope", numberScope);
        map.put("oneQuestionPerPage", oneQuestionPerPage);
        map.put("allowBackToQuestions", allowBackToQuestions);
        map.put("allowBackToPart", allowBackToPart);
        map.put("allowBackToSection", allowBackToSection);
        map.put("audioAutoStart", audioAutoStart);
        map.put("videoAutoStart", videoAutoStart);
        map.put("shuffleChoices", false);
        return map;
    }

    public record ExamPreset(
            String id,
            String title,
            String family,
            List<PresetSection> sections,
            Map<String, Object> defaultSettings) {
    }

    public record PresetSection(
            String title,
            String sectionType,
            Integer timeLimitMinutes,
            String instructions,
            Boolean allowBackToQuestions,
            Boolean allowBackToPart,
            List<PresetPart> parts,
            Boolean speakingAutoFlow) {
    }

    public record PresetPart(
            String title,
            Boolean oneQuestionPerPage,
            Integer timeLimitMinutes,
            Integer timeLimitSeconds,
            Boolean autoAdvanceOnTimeout) {
    }
}