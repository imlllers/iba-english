package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.Tokens;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.test.AccessDates;
import com.iba.testing.test.ListeningTiming;
import com.iba.testing.test.ResultDisplay;
import com.iba.testing.test.PartTiming;
import com.iba.testing.test.SectionTiming;
import com.iba.testing.question.engine.GradeOutcome;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestRepository;
import com.iba.testing.test.TestStatus;
import com.iba.testing.test.TestVersion;
import com.iba.testing.test.TestVersionRepository;
import com.iba.testing.test.TestViews;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iba.testing.notification.NotificationEvents;
import com.iba.testing.scale.ScaleEvaluator;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PublicAttemptService {

    private static final int MAX_ANSWER_CHARS = 100_000;
    private static final int TOEFL_SAVE_GRACE_SECONDS = 3;

    private final ExamTestRepository tests;
    private final TestVersionRepository versions;
    private final TestAttemptRepository attempts;
    private final AnswerRepository answers;
    private final TestViews views;
    private final QuestionEngines grading;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final ScaleEvaluator scales;
    private final ResultMailer resultMailer;
    private final ApplicationEventPublisher events;
    private final PartPauseResolver partPauseResolver;

    public PublicAttemptService(ExamTestRepository tests, TestVersionRepository versions, TestAttemptRepository attempts,
                                AnswerRepository answers, TestViews views, QuestionEngines grading, ObjectMapper mapper,
                                Clock clock, ScaleEvaluator scales, ResultMailer resultMailer,
                                ApplicationEventPublisher events, PartPauseResolver partPauseResolver) {
        this.tests = tests;
        this.versions = versions;
        this.attempts = attempts;
        this.answers = answers;
        this.views = views;
        this.grading = grading;
        this.mapper = mapper;
        this.clock = clock;
        this.scales = scales;
        this.resultMailer = resultMailer;
        this.events = events;
        this.partPauseResolver = partPauseResolver;
    }

    @Transactional(readOnly = true)
    public ObjectNode publishedTest(String publicToken) {
        Published published = requirePublished(publicToken);
        ensureAvailable(published.version().getSettingsSnapshot());
        return views.publicView(
                published.version().getContentSnapshot(),
                published.version().getSettingsSnapshot(),
                published.test().getExamPreset());
    }

    @Transactional
    public ObjectNode start(String publicToken, String participantName, String participantEmail) {
        Published published = requirePublished(publicToken);
        JsonNode settings = published.version().getSettingsSnapshot();
        ensureAvailable(settings);
        if (participantName == null || participantName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NAME_REQUIRED", "Введите имя и фамилию");
        }
        String email = participantEmail == null || participantEmail.isBlank() ? null : participantEmail.trim();
        if (settings.path("requireParticipantEmail").asBoolean(true)) {
            if (email == null || !emailLooksValid(email)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_REQUIRED", "Введите корректный email");
            }
        } else if (email != null && !emailLooksValid(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Некорректный email");
        }
        if (settings.path("maxAttempts").isNumber() && settings.path("maxAttempts").asInt() > 0) {
            long used = attempts.countByTestVersion(published.version());
            if (used >= settings.path("maxAttempts").asInt()) {
                throw new ApiException(HttpStatus.CONFLICT, "ATTEMPTS_EXCEEDED", "Лимит попыток исчерпан");
            }
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        String token = Tokens.random();
        TestAttempt attempt = new TestAttempt();
        attempt.setId(UUID.randomUUID());
        attempt.setTestVersion(published.version());
        attempt.setParticipantName(participantName == null || participantName.isBlank() ? null : participantName.trim());
        attempt.setParticipantEmail(email);
        attempt.setAccessTokenHash(Tokens.sha256(token));
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt.setStartedAt(now);
        if (settings.path("timeLimitMinutes").isNumber() && settings.path("timeLimitMinutes").asInt() > 0
                && !hasTimedSectionTypes(settings)) {
            attempt.setExpiresAt(now.plusMinutes(settings.path("timeLimitMinutes").asInt()));
        }
        ObjectNode progress = mapper.createObjectNode();
        progress.putObject("sections");
        attempt.setProgress(progress);
        attempts.save(attempt);
        ObjectNode response = mapper.createObjectNode();
        response.put("attemptToken", token);
        response.put("status", attempt.getStatus().name());
        if (attempt.getExpiresAt() == null) {
            response.putNull("expiresAt");
        } else {
            response.put("expiresAt", attempt.getExpiresAt().toString());
        }
        response.putNull("blockEndsAt");
        response.set("test", views.publicView(
                published.version().getContentSnapshot(),
                settings,
                published.test().getExamPreset()));
        putAudioDone(response, attempt);
        putReadingProgress(response, attempt);
        return response;
    }

    @Transactional
    public ObjectNode markAudioDone(String attemptToken, JsonNode body) {
        String key = body.path("key").asText("").trim();
        if (key.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ключ аудио обязателен");
        }
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        ObjectNode progress = attempt.getProgress().deepCopy();
        ArrayNode done = progress.has("audioDone") && progress.get("audioDone").isArray()
                ? (ArrayNode) progress.get("audioDone").deepCopy()
                : progress.putArray("audioDone");
        boolean exists = false;
        for (JsonNode item : done) {
            if (key.equals(item.asText())) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            done.add(key);
            progress.set("audioDone", done);
            attempt.setProgress(progress);
        }
        return mapper.createObjectNode().put("saved", true);
    }

    @Transactional
    public ObjectNode startSection(String attemptToken, UUID sectionId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode section = findSection(attempt, sectionId);
        if (section == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Секция не найдена");
        }
        ObjectNode node = mapper.createObjectNode();
        ensureBlockTimer(attempt, section);
        putBlockEndsAt(node, attempt);
        int limitSeconds = SectionTiming.limitSeconds(section);
        if (limitSeconds <= 0) {
            node.putNull("endsAt");
            return node;
        }
        OffsetDateTime started = progressStart(attempt, "sections", sectionId.toString());
        node.put("endsAt", started.plusSeconds(limitSeconds).toString());
        return node;
    }

    @Transactional
    public ObjectNode startPart(String attemptToken, UUID partId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode part = findPart(attempt, partId);
        if (part == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Часть не найдена");
        }
        String partKey = partId.toString();
        boolean firstStart = !attempt.getProgress().path("parts").hasNonNull(partKey);
        if (firstStart && isToeflFamily(attempt)) {
            closeOtherParts(attempt, partKey);
        }
        ObjectNode node = mapper.createObjectNode();
        int limitSeconds = PartTiming.limitSeconds(part);
        if (limitSeconds <= 0) {
            node.putNull("endsAt");
            return node;
        }
        OffsetDateTime started = progressStart(attempt, "parts", partKey);
        node.put("endsAt", partDeadline(attempt, started, limitSeconds, partKey).toString());
        return node;
    }

    @Transactional
    public ObjectNode pausePartTimer(String attemptToken, UUID partId, JsonNode body) {
        if (body == null || body.isNull()) {
            body = mapper.createObjectNode();
        }
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        if (!attempt.getTestVersion().getSettingsSnapshot().path("pausePartTimerDuringAudio").asBoolean(false)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PAUSE_DISABLED", "Пауза таймера части выключена");
        }
        JsonNode part = findPart(attempt, partId);
        if (part == null || PartTiming.limitSeconds(part) <= 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Часть без таймера");
        }
        String audioKey = body.path("audioKey").asText("").trim();
        if (audioKey.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Нужен audioKey");
        }
        int durationSeconds = partPauseResolver.resolveMaxSeconds(
                attempt.getTestVersion().getContentSnapshot(),
                partId,
                audioKey);
        ObjectNode progress = attempt.getProgress().deepCopy();
        String partKey = partId.toString();
        ObjectNode partMeta = progress.withObjectProperty("partPauseMeta").withObject(partKey);
        ObjectNode keyMeta = partMeta.withObject(audioKey);
        if (!keyMeta.has("maxMs")) {
            keyMeta.put("maxMs", durationSeconds * 1000L);
            keyMeta.put("usedMs", 0L);
        }
        ObjectNode sinceByPart = progress.withObjectProperty("partPauseSince").withObject(partKey);
        List<String> otherPauseKeys = new ArrayList<>();
        sinceByPart.fieldNames().forEachRemaining(name -> {
            if (!name.equals(audioKey)) {
                otherPauseKeys.add(name);
            }
        });
        for (String otherKey : otherPauseKeys) {
            JsonNode since = sinceByPart.path(otherKey);
            if (since.isTextual() && !since.asText().isBlank()) {
                applyPartPauseDelta(progress, partKey, otherKey, since.asText());
                sinceByPart.remove(otherKey);
            }
        }
        long maxMs = keyMeta.path("maxMs").asLong(0);
        long usedMs = keyMeta.path("usedMs").asLong(0);
        if (usedMs < maxMs && !sinceByPart.hasNonNull(audioKey)) {
            sinceByPart.put(audioKey, OffsetDateTime.now(clock).toString());
        }
        attempt.setProgress(progress);
        ObjectNode node = mapper.createObjectNode();
        node.put("endsAt", currentPartEndsAt(attempt, partKey, part).toString());
        return node;
    }

    @Transactional
    public ObjectNode resumePartTimer(String attemptToken, UUID partId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode part = findPart(attempt, partId);
        if (part == null || PartTiming.limitSeconds(part) <= 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Часть без таймера");
        }
        ObjectNode progress = attempt.getProgress().deepCopy();
        String partKey = partId.toString();
        JsonNode sinceByPart = progress.path("partPauseSince").path(partKey);
        if (sinceByPart.isObject()) {
            ObjectNode sinceObject = (ObjectNode) sinceByPart;
            List<String> audioKeys = new ArrayList<>();
            sinceObject.fieldNames().forEachRemaining(audioKeys::add);
            for (String audioKey : audioKeys) {
                JsonNode since = sinceObject.path(audioKey);
                if (since.isTextual() && !since.asText().isBlank()) {
                    applyPartPauseDelta(progress, partKey, audioKey, since.asText());
                    sinceObject.remove(audioKey);
                }
            }
            if (sinceObject.isEmpty()) {
                progress.withObjectProperty("partPauseSince").remove(partKey);
            }
            attempt.setProgress(progress);
        } else if (sinceByPart.isTextual() && !sinceByPart.asText().isBlank()) {
            String legacyKey = progress.path("partPauseMeta").path(partKey).path("audioKey").asText("legacy");
            applyPartPauseDelta(progress, partKey, legacyKey, sinceByPart.asText());
            progress.withObjectProperty("partPauseSince").remove(partKey);
            attempt.setProgress(progress);
        }
        ObjectNode node = mapper.createObjectNode();
        node.put("endsAt", currentPartEndsAt(attempt, partId.toString(), part).toString());
        return node;
    }

    @Transactional
    public ObjectNode startQuestion(String attemptToken, UUID questionId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode question = requireQuestion(attempt, questionId);
        String questionKey = questionId.toString();
        boolean firstStart = !attempt.getProgress().path("questions").hasNonNull(questionKey);
        if (firstStart) {
            JsonNode section = findSectionForQuestion(attempt, question);
            if (section != null && usesListeningClosePolicy(attempt, section)) {
                closePriorListeningQuestions(attempt, section, questionKey, question);
            }
        }
        ObjectNode node = mapper.createObjectNode();
        int limit = questionLimit(attempt, question);
        if (limit <= 0) {
            node.putNull("endsAt");
            return node;
        }
        JsonNode section = findSectionForQuestion(attempt, question);
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("");
        OffsetDateTime started = syncedQuestionStart(attempt, section, question, questionKey, examType);
        node.put("endsAt", questionDeadline(attempt, started, limit).toString());
        return node;
    }

    @Transactional
    public ObjectNode markReadingStarted(String attemptToken, UUID questionId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        requireQuestion(attempt, questionId);
        ObjectNode progress = attempt.getProgress().deepCopy();
        ObjectNode started = progress.withObjectProperty("readingStarted");
        String key = questionId.toString();
        if (!started.hasNonNull(key)) {
            started.put(key, OffsetDateTime.now(clock).toString());
            attempt.setProgress(progress);
        }
        return mapper.createObjectNode().put("saved", true);
    }

    @Transactional
    public ObjectNode markReadingDone(String attemptToken, UUID questionId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        requireQuestion(attempt, questionId);
        ObjectNode progress = attempt.getProgress().deepCopy();
        ArrayNode done = progress.has("readingDone") && progress.get("readingDone").isArray()
                ? (ArrayNode) progress.get("readingDone").deepCopy()
                : progress.putArray("readingDone");
        String key = questionId.toString();
        boolean exists = false;
        for (JsonNode item : done) {
            if (key.equals(item.asText())) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            done.add(key);
            progress.set("readingDone", done);
            attempt.setProgress(progress);
        }
        return mapper.createObjectNode().put("saved", true);
    }

    @Transactional
    public ObjectNode saveAnswer(String attemptToken, UUID questionId, JsonNode answerData) {
        saveAnswerData(requireOpenAttempt(attemptToken), questionId, answerData);
        return mapper.createObjectNode().put("saved", true);
    }

    @Transactional
    public ObjectNode checkAnswer(String attemptToken, UUID questionId, JsonNode answerData) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode question = saveAnswerData(attempt, questionId, answerData);
        ObjectNode node = mapper.createObjectNode();
        String mode = attempt.getTestVersion().getSettingsSnapshot().path("errorExplanationMode").asText("off");
        if (!duringExplanation(mode)) {
            node.put("checked", true);
            return node;
        }
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("CUSTOM");
        GradeOutcome outcome = grading.grade(question, answerData == null ? mapper.createObjectNode() : answerData, examType);
        if (outcome.needsReview()) {
            node.put("needsReview", true);
            return node;
        }
        boolean correct = outcome.awarded() != null && outcome.awarded().compareTo(outcome.max()) >= 0;
        node.put("correct", correct);
        if (!correct) {
            String explanation = errorExplanation(question);
            if (!explanation.isEmpty()) {
                node.put("explanation", explanation);
            }
        }
        return node;
    }

    private JsonNode saveAnswerData(TestAttempt attempt, UUID questionId, JsonNode answerData) {
        if (answerData == null || !answerData.isObject() || answerData.toString().length() > MAX_ANSWER_CHARS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ответ слишком большой или повреждён");
        }
        JsonNode question = requireQuestion(attempt, questionId);
        ensureToeflAnswerAllowed(attempt, question);
        ensureSectionOpen(attempt, question);
        ensurePartOpen(attempt, question);
        ensureQuestionOpen(attempt, question);
        Answer answer = answers.findByAttemptAndQuestionId(attempt, questionId).orElseGet(() -> {
            Answer created = new Answer();
            created.setId(UUID.randomUUID());
            created.setAttempt(attempt);
            created.setQuestionId(questionId);
            return created;
        });
        answer.setAnswerData(answerData);
        answer.setNeedsReview(false);
        answers.save(answer);
        return question;
    }

    private static boolean duringExplanation(String mode) {
        return "during".equals(mode) || "both".equals(mode);
    }

    private static boolean afterExplanation(String mode) {
        return "after".equals(mode) || "both".equals(mode);
    }

    private static String errorExplanation(JsonNode question) {
        String text = question.path("settings").path("errorExplanation").asText("").trim();
        return text.length() > 2000 ? text.substring(0, 2000) : text;
    }

    @Transactional
    public ObjectNode submit(String attemptToken) {
        TestAttempt attempt = attempts.findLockedByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            return participantResult(attempt, false);
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        boolean needsReview = false;
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("CUSTOM");
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            for (JsonNode question : section.path("questions")) {
                UUID questionId = UUID.fromString(question.path("id").asText());
                Answer answer = answers.findByAttemptAndQuestionId(attempt, questionId).orElse(null);
                JsonNode data = answer == null ? mapper.createObjectNode() : answer.getAnswerData();
                if (answer == null) {
                    answer = new Answer();
                    answer.setId(UUID.randomUUID());
                    answer.setAttempt(attempt);
                    answer.setQuestionId(questionId);
                    answer.setAnswerData(data);
                }
                GradeOutcome outcome = grading.grade(question, data, examType);
                answer.setMaxScore(outcome.max());
                answer.setNeedsReview(outcome.needsReview());
                answer.setAwardedScore(outcome.needsReview() ? null : outcome.awarded());
                answers.save(answer);
                max = max.add(outcome.max());
                if (outcome.needsReview()) {
                    needsReview = true;
                } else if (outcome.awarded() != null) {
                    score = score.add(outcome.awarded());
                }
            }
        }
        attempt.setSubmittedAt(now);
        attempt.setScore(score.max(BigDecimal.ZERO));
        attempt.setMaxScore(max);
        attempt.setStatus(needsReview ? AttemptStatus.NEEDS_REVIEW : AttemptStatus.AUTO_GRADED);
        scales.apply(attempt, answers.findByAttempt(attempt));
        resultMailer.sendIfReady(attempt);
        if (needsReview) {
            var test = attempt.getTestVersion().getTest();
            events.publishEvent(new NotificationEvents.AttemptNeedsReview(test.getOwner().getId(), attempt.getId(), test.getTitle(), attempt.getParticipantName()));
        }
        return participantResult(attempt, false);
    }

    @Transactional(readOnly = true)
    public ObjectNode result(String attemptToken) {
        TestAttempt attempt = attempts.findByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
        return participantResult(attempt, true);
    }

    @Transactional(readOnly = true)
    public ObjectNode resume(String attemptToken) {
        TestAttempt attempt = requireAttempt(attemptToken);
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Попытка уже отправлена");
        }
        ObjectNode node = mapper.createObjectNode();
        node.put("status", attempt.getStatus().name());
        if (attempt.getExpiresAt() == null) {
            node.putNull("expiresAt");
        } else {
            node.put("expiresAt", attempt.getExpiresAt().toString());
        }
        putBlockEndsAt(node, attempt);
        putTimerEnds(node, attempt);
        node.set("test", views.publicView(
                attempt.getTestVersion().getContentSnapshot(),
                attempt.getTestVersion().getSettingsSnapshot(),
                attempt.getTestVersion().getTest().getExamPreset()));
        var saved = node.putArray("answers");
        for (Answer answer : answers.findByAttempt(attempt)) {
            ObjectNode item = saved.addObject();
            item.put("questionId", answer.getQuestionId().toString());
            item.set("answerData", answer.getAnswerData());
        }
        putAudioDone(node, attempt);
        putReadingProgress(node, attempt);
        return node;
    }

    private void putTimerEnds(ObjectNode node, TestAttempt attempt) {
        ObjectNode sectionEnds = node.putObject("sectionEnds");
        ObjectNode partEnds = node.putObject("partEnds");
        ObjectNode questionEnds = node.putObject("questionEnds");
        JsonNode snapshot = attempt.getTestVersion().getContentSnapshot();
        JsonNode progress = attempt.getProgress();
        if (snapshot == null || progress == null) {
            return;
        }
        for (JsonNode section : snapshot.path("sections")) {
            String sectionId = section.path("id").asText("");
            JsonNode sectionStarted = progress.path("sections").path(sectionId);
            int sectionLimit = SectionTiming.limitSeconds(section);
            if (sectionLimit > 0 && sectionStarted.isTextual() && !sectionStarted.asText().isBlank()) {
                try {
                    sectionEnds.put(
                            sectionId,
                            OffsetDateTime.parse(sectionStarted.asText()).plusSeconds(sectionLimit).toString());
                } catch (RuntimeException ignored) {
                }
            }
            for (JsonNode part : section.path("parts")) {
                String partId = part.path("id").asText("");
                JsonNode partStarted = progress.path("parts").path(partId);
                int partLimit = PartTiming.limitSeconds(part);
                if (partLimit > 0 && partStarted.isTextual() && !partStarted.asText().isBlank()) {
                    try {
                        OffsetDateTime started = OffsetDateTime.parse(partStarted.asText());
                        partEnds.put(partId, partDeadline(attempt, started, partLimit, partId).toString());
                    } catch (RuntimeException ignored) {
                    }
                }
            }
            for (JsonNode question : section.path("questions")) {
                String questionId = question.path("id").asText("");
                JsonNode questionStarted = progress.path("questions").path(questionId);
                int limit = questionLimit(attempt, question);
                if (limit > 0 && questionStarted.isTextual() && !questionStarted.asText().isBlank()) {
                    try {
                        OffsetDateTime started = OffsetDateTime.parse(questionStarted.asText());
                        questionEnds.put(questionId, questionDeadline(attempt, started, limit).toString());
                    } catch (RuntimeException ignored) {
                    }
                }
            }
        }
    }

    private void putAudioDone(ObjectNode response, TestAttempt attempt) {
        ArrayNode done = mapper.createArrayNode();
        JsonNode progress = attempt.getProgress();
        if (progress != null && progress.path("audioDone").isArray()) {
            for (JsonNode item : progress.get("audioDone")) {
                done.add(item.asText());
            }
        }
        response.set("audioDone", done);
    }

    private void putReadingProgress(ObjectNode response, TestAttempt attempt) {
        JsonNode progress = attempt.getProgress();
        ObjectNode reading = response.putObject("reading");
        ObjectNode started = reading.putObject("started");
        if (progress != null && progress.path("readingStarted").isObject()) {
            progress.path("readingStarted").properties().forEach(entry ->
                    started.put(entry.getKey(), entry.getValue().asText()));
        }
        ArrayNode done = reading.putArray("done");
        if (progress != null && progress.path("readingDone").isArray()) {
            for (JsonNode item : progress.get("readingDone")) {
                done.add(item.asText());
            }
        }
    }

    private static boolean hasTimedSectionTypes(JsonNode settings) {
        JsonNode types = settings.path("timeLimitSectionTypes");
        return types.isArray() && types.size() > 0;
    }

    private void ensureBlockTimer(TestAttempt attempt, JsonNode section) {
        JsonNode settings = attempt.getTestVersion().getSettingsSnapshot();
        if (!hasTimedSectionTypes(settings)) {
            return;
        }
        int minutes = settings.path("timeLimitMinutes").asInt(0);
        if (minutes <= 0) {
            return;
        }
        String sectionType = section.path("sectionType").asText("");
        boolean inBlock = false;
        for (JsonNode type : settings.path("timeLimitSectionTypes")) {
            if (type.asText("").equals(sectionType)) {
                inBlock = true;
                break;
            }
        }
        if (!inBlock) {
            return;
        }
        ObjectNode progress = attempt.getProgress().deepCopy();
        if (!progress.path("blockEndsAt").isTextual() || progress.path("blockEndsAt").asText().isBlank()) {
            progress.put("blockEndsAt", OffsetDateTime.now(clock).plusMinutes(minutes).toString());
            attempt.setProgress(progress);
            attempts.save(attempt);
        }
    }

    private void putBlockEndsAt(ObjectNode node, TestAttempt attempt) {
        JsonNode blockEnds = attempt.getProgress().path("blockEndsAt");
        if (blockEnds.isTextual() && !blockEnds.asText().isBlank()) {
            node.put("blockEndsAt", blockEnds.asText());
        } else {
            node.putNull("blockEndsAt");
        }
    }

    public TestAttempt requireAttempt(String attemptToken) {
        return attempts.findByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
    }

    private static boolean contentHasSpeakingSection(TestAttempt attempt) {
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            if ("SPEAKING".equals(section.path("sectionType").asText(""))) {
                return true;
            }
        }
        return false;
    }

    private ObjectNode participantResult(TestAttempt attempt, boolean reading) {
        JsonNode settings = attempt.getTestVersion().getSettingsSnapshot();
        boolean show = settings.path("showResultToParticipant").asBoolean(true);
        boolean emailResult = settings.path("emailResultToParticipant").asBoolean(false);
        String detail = ResultDisplay.normalizeDetail(settings);
        ObjectNode node = mapper.createObjectNode();
        node.put("status", attempt.getStatus().name());
        node.put("submitted", attempt.getStatus() != AttemptStatus.IN_PROGRESS);
        node.put("resultDetail", detail);
        node.put("examType", settings.path("examType").asText("CUSTOM"));
        node.put("showResultToParticipant", show);
        node.put("emailResultToParticipant", emailResult);
        node.put("hasSpeakingSection", contentHasSpeakingSection(attempt));
        String participantEmail = attempt.getParticipantEmail();
        if (participantEmail != null && !participantEmail.isBlank()) {
            node.put("participantEmail", participantEmail.trim());
        } else {
            node.putNull("participantEmail");
        }
        if (!show) {
            node.put("scoreVisible", false);
            return node;
        }
        boolean reviewed = attempt.getStatus() == AttemptStatus.REVIEWED;
        boolean autoGraded = attempt.getStatus() == AttemptStatus.AUTO_GRADED;
        boolean needsReview = attempt.getStatus() == AttemptStatus.NEEDS_REVIEW;
        boolean finalScore = autoGraded || reviewed;
        boolean showScore = finalScore || (needsReview && show);
        node.put("scoreVisible", showScore);
        node.put("reviewVisible", false);
        if (showScore) {
            node.put("score", attempt.getScore());
            node.put("maxScore", attempt.getMaxScore());
            if (needsReview) {
                node.put("pendingReview", true);
            }
        } else if (needsReview) {
            node.put("pendingReview", true);
        } else if (reading && attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            node.put("scoreVisible", false);
        }
        if (show && ResultDisplay.showsScale(settings) && attempt.getScaleResult() != null) {
            node.set("scale", attempt.getScaleResult());
        }
        return node;
    }

    private void appendExplanationItems(ObjectNode node, TestAttempt attempt) {
        var items = node.putArray("explanations");
        JsonNode settings = attempt.getTestVersion().getSettingsSnapshot();
        String scope = settings.path("questionNumberScope").asText("test");
        if (!scope.equals("section") && !scope.equals("part")) {
            scope = "test";
        }
        String examType = settings.path("examType").asText("CUSTOM");
        int number = 1;
        String lastBoundary = "";
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            for (JsonNode question : section.path("questions")) {
                String boundary = numberScopeBoundary(scope, section, question);
                if (!scope.equals("test") && !boundary.equals(lastBoundary)) {
                    number = 1;
                    lastBoundary = boundary;
                } else if (lastBoundary.isEmpty()) {
                    lastBoundary = boundary;
                }
                UUID questionId = UUID.fromString(question.path("id").asText());
                int slots = Math.max(1, questionSlotHint(question, examType));
                Answer answer = answers.findByAttemptAndQuestionId(attempt, questionId).orElse(null);
                ObjectNode item = items.addObject();
                item.put("questionId", questionId.toString());
                item.put("number", number);
                item.put("count", slots);
                if (answer == null || (answer.isNeedsReview() && answer.getAwardedScore() == null)) {
                    item.putNull("correct");
                } else if (answer.getAwardedScore() != null
                        && answer.getMaxScore() != null
                        && answer.getAwardedScore().compareTo(answer.getMaxScore()) >= 0) {
                    item.put("correct", true);
                } else {
                    item.put("correct", false);
                    String explanation = errorExplanation(question);
                    if (!explanation.isEmpty()) {
                        item.put("explanation", explanation);
                    }
                }
                number += slots;
            }
        }
    }

    private static String numberScopeBoundary(String scope, JsonNode section, JsonNode question) {
        if ("section".equals(scope)) {
            return "section:" + section.path("id").asText();
        }
        if ("part".equals(scope)) {
            String partId = question.path("partId").asText("");
            if (!partId.isEmpty() && !partId.equals("null")) {
                return "part:" + partId;
            }
            return "section:" + section.path("id").asText();
        }
        return "test";
    }

    private int questionSlotHint(JsonNode question, String examType) {
        JsonNode blanks = question.path("answerKey").path("blanks");
        if (blanks.isObject() && blanks.size() > 0) {
            return blanks.size();
        }
        JsonNode errors = question.path("answerKey").path("errors");
        if (errors.isObject() && errors.size() > 0) {
            return errors.size();
        }
        JsonNode answers = question.path("answerKey").path("answers");
        if (answers.isObject() && answers.size() > 0) {
            return answers.size();
        }
        boolean multiSelect = "MULTIPLE_SELECT".equals(question.path("type").asText(""));
        boolean ieltsMulti = multiSelect && "IELTS".equals(examType);
        JsonNode correctIds = question.path("answerKey").path("correctOptionIds");
        if (correctIds.isArray() && correctIds.size() > 0) {
            return ieltsMulti ? correctIds.size() : (multiSelect ? 1 : correctIds.size());
        }
        int selectCount = question.path("settings").path("selectCount").asInt(0);
        if (selectCount > 0) {
            return ieltsMulti ? selectCount : (multiSelect ? 1 : selectCount);
        }
        JsonNode left = question.path("options").path("left");
        if (left.isArray() && left.size() > 0) {
            return left.size();
        }
        JsonNode statements = question.path("options").path("statements");
        if (statements.isArray() && statements.size() > 0) {
            return statements.size();
        }
        int points = question.path("scoringConfig").path("points").asInt(0);
        if (multiSelect && points > 1) {
            return ieltsMulti ? points : 1;
        }
        return 1;
    }

    private TestAttempt requireOpenAttempt(String attemptToken) {
        TestAttempt attempt = attempts.findLockedByAccessTokenHash(Tokens.sha256(attemptToken))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Попытка уже отправлена");
        }
        if (attempt.getExpiresAt() != null && OffsetDateTime.now(clock).isAfter(attempt.getExpiresAt())) {
            throw new ApiException(HttpStatus.CONFLICT, "TIME_EXPIRED", "Время теста истекло");
        }
        return attempt;
    }

    private JsonNode requireQuestion(TestAttempt attempt, UUID questionId) {
        JsonNode question = findQuestion(attempt.getTestVersion().getContentSnapshot(), questionId);
        if (question == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Задание не найдено");
        }
        return question;
    }

    private void ensureSectionOpen(TestAttempt attempt, JsonNode question) {
        JsonNode section = findSectionForQuestion(attempt, question);
        int limitSeconds = section == null ? 0 : SectionTiming.limitSeconds(section);
        if (limitSeconds <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "sections", section.path("id").asText());
        if (OffsetDateTime.now(clock).isAfter(started.plusSeconds(limitSeconds))) {
            throw new ApiException(HttpStatus.CONFLICT, "SECTION_EXPIRED", "Время секции истекло");
        }
    }

    private void ensurePartOpen(TestAttempt attempt, JsonNode question) {
        String partId = question.path("partId").asText("");
        if (partId.isBlank()) {
            return;
        }
        JsonNode part = findPart(attempt, UUID.fromString(partId));
        int limitSeconds = PartTiming.limitSeconds(part);
        if (part == null || limitSeconds <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "parts", partId);
        OffsetDateTime deadline = partDeadline(attempt, started, limitSeconds, partId);
        if (isToeflFamily(attempt)) {
            deadline = deadline.plusSeconds(TOEFL_SAVE_GRACE_SECONDS);
        }
        if (OffsetDateTime.now(clock).isAfter(deadline)) {
            throw new ApiException(HttpStatus.CONFLICT, "PART_EXPIRED", "Время части истекло");
        }
    }

    private int questionLimit(TestAttempt attempt, JsonNode question) {
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("");
        JsonNode section = findSectionForQuestion(attempt, question);
        return ListeningTiming.questionLimit(examType, section, question);
    }

    private void ensureQuestionOpen(TestAttempt attempt, JsonNode question) {
        int limit = questionLimit(attempt, question);
        if (limit <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "questions", question.path("id").asText());
        OffsetDateTime deadline = questionDeadline(attempt, started, limit);
        if (OffsetDateTime.now(clock).isAfter(deadline)) {
            throw new ApiException(HttpStatus.CONFLICT, "QUESTION_EXPIRED", "Время задания истекло");
        }
    }

    private OffsetDateTime questionDeadline(TestAttempt attempt, OffsetDateTime started, int limitSeconds) {
        return started.plusSeconds(limitSeconds);
    }

    private boolean isToeflFamily(TestAttempt attempt) {
        return "TOEFL".equals(attempt.getTestVersion().getSettingsSnapshot().path("examType").asText(""));
    }

    private boolean usesListeningClosePolicy(TestAttempt attempt, JsonNode section) {
        if (!"LISTENING".equals(section.path("sectionType").asText(""))) {
            return false;
        }
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("");
        return "TOEFL".equals(examType) || "TOEIC".equals(examType);
    }

    private OffsetDateTime syncedQuestionStart(
            TestAttempt attempt, JsonNode section, JsonNode question, String questionKey, String examType) {
        String blockId = question.path("materialBlockId").asText("");
        if (!"TOEIC".equals(examType) || blockId.isBlank() || section == null) {
            return progressStart(attempt, "questions", questionKey);
        }
        JsonNode started = attempt.getProgress().path("questions");
        for (JsonNode item : section.path("questions")) {
            if (!blockId.equals(item.path("materialBlockId").asText(""))) {
                continue;
            }
            String siblingId = item.path("id").asText();
            if (started.hasNonNull(siblingId)) {
                OffsetDateTime existing = OffsetDateTime.parse(started.path(siblingId).asText());
                if (!started.hasNonNull(questionKey)) {
                    ObjectNode progress = attempt.getProgress().deepCopy();
                    progress.withObjectProperty("questions").put(questionKey, existing.toString());
                    attempt.setProgress(progress);
                }
                return existing;
            }
        }
        return progressStart(attempt, "questions", questionKey);
    }

    private boolean usesClosedAnswerPolicy(TestAttempt attempt, JsonNode question) {
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("");
        if ("TOEFL".equals(examType)) {
            return true;
        }
        if ("TOEIC".equals(examType)) {
            JsonNode section = findSectionForQuestion(attempt, question);
            return section != null && "LISTENING".equals(section.path("sectionType").asText(""));
        }
        return false;
    }

    private void ensureToeflAnswerAllowed(TestAttempt attempt, JsonNode question) {
        if (!usesClosedAnswerPolicy(attempt, question)) {
            return;
        }
        String partId = question.path("partId").asText("");
        if (!partId.isBlank() && progressContains(attempt.getProgress().path("closedParts"), partId)) {
            throw new ApiException(HttpStatus.CONFLICT, "PART_CLOSED", "Время части истекло");
        }
        String questionId = question.path("id").asText();
        if (progressContains(attempt.getProgress().path("closedQuestions"), questionId)) {
            throw new ApiException(HttpStatus.CONFLICT, "QUESTION_CLOSED", "Время задания истекло");
        }
    }

    private static boolean progressContains(JsonNode array, String id) {
        if (!array.isArray()) {
            return false;
        }
        for (JsonNode item : array) {
            if (id.equals(item.asText())) {
                return true;
            }
        }
        return false;
    }

    private void closeOtherParts(TestAttempt attempt, String activePartId) {
        ObjectNode progress = attempt.getProgress().deepCopy();
        JsonNode started = progress.path("parts");
        if (!started.isObject()) {
            return;
        }
        ArrayNode closed = progress.has("closedParts") && progress.get("closedParts").isArray()
                ? (ArrayNode) progress.get("closedParts").deepCopy()
                : progress.putArray("closedParts");
        started.properties().forEach(entry -> {
            String partId = entry.getKey();
            if (!partId.equals(activePartId) && !progressContains(closed, partId)) {
                closed.add(partId);
            }
        });
        progress.set("closedParts", closed);
        attempt.setProgress(progress);
    }

    private void closePriorListeningQuestions(TestAttempt attempt, JsonNode section, String activeQuestionId, JsonNode activeQuestion) {
        if (!"LISTENING".equals(section.path("sectionType").asText(""))) {
            return;
        }
        String activeBlock = activeQuestion.path("materialBlockId").asText("");
        ObjectNode progress = attempt.getProgress().deepCopy();
        JsonNode started = progress.path("questions");
        ArrayNode closed = progress.has("closedQuestions") && progress.get("closedQuestions").isArray()
                ? (ArrayNode) progress.get("closedQuestions").deepCopy()
                : progress.putArray("closedQuestions");
        for (JsonNode item : section.path("questions")) {
            String questionId = item.path("id").asText();
            if (questionId.equals(activeQuestionId)) {
                break;
            }
            if (!started.hasNonNull(questionId) || progressContains(closed, questionId)) {
                continue;
            }
            if (!activeBlock.isBlank() && activeBlock.equals(item.path("materialBlockId").asText(""))) {
                continue;
            }
            closed.add(questionId);
        }
        progress.set("closedQuestions", closed);
        attempt.setProgress(progress);
    }

    private OffsetDateTime currentPartEndsAt(TestAttempt attempt, String partId, JsonNode part) {
        int limitSeconds = PartTiming.limitSeconds(part);
        JsonNode progress = attempt.getProgress();
        if (!progress.path("parts").hasNonNull(partId)) {
            return OffsetDateTime.now(clock).plusSeconds(limitSeconds);
        }
        OffsetDateTime started = OffsetDateTime.parse(progress.path("parts").path(partId).asText());
        return partDeadline(attempt, started, limitSeconds, partId);
    }

    private OffsetDateTime partDeadline(TestAttempt attempt, OffsetDateTime started, int limitSeconds, String partId) {
        JsonNode progress = attempt.getProgress();
        long pauseMs = progress.path("partPauseMs").path(partId).asLong(0);
        JsonNode pauseSince = progress.path("partPauseSince").path(partId);
        if (pauseSince.isObject()) {
            List<String> keys = new ArrayList<>();
            pauseSince.fieldNames().forEachRemaining(keys::add);
            for (String audioKey : keys) {
                JsonNode since = pauseSince.path(audioKey);
                if (since.isTextual() && !since.asText().isBlank()) {
                    pauseMs += cappedOpenPauseMs(progress, partId, audioKey, since.asText());
                }
            }
        } else if (pauseSince.isTextual() && !pauseSince.asText().isBlank()) {
            String legacyKey = progress.path("partPauseMeta").path(partId).path("audioKey").asText("legacy");
            pauseMs += cappedOpenPauseMs(progress, partId, legacyKey, pauseSince.asText());
        }
        return started.plusSeconds(limitSeconds).plus(java.time.Duration.ofMillis(pauseMs));
    }

    private long cappedOpenPauseMs(JsonNode progress, String partId, String audioKey, String sinceIso) {
        long added = java.time.Duration.between(OffsetDateTime.parse(sinceIso), OffsetDateTime.now(clock)).toMillis();
        JsonNode keyMeta = partPauseKeyMeta(progress, partId, audioKey);
        if (keyMeta != null && keyMeta.isObject()) {
            long maxMs = keyMeta.path("maxMs").asLong(0);
            long usedMs = keyMeta.path("usedMs").asLong(0);
            added = Math.min(added, Math.max(0, maxMs - usedMs));
        }
        return added;
    }

    private void applyPartPauseDelta(ObjectNode progress, String partId, String audioKey, String sinceIso) {
        long added = cappedOpenPauseMs(progress, partId, audioKey, sinceIso);
        JsonNode keyMeta = partPauseKeyMeta(progress, partId, audioKey);
        if (keyMeta != null && keyMeta.isObject()) {
            long usedMs = keyMeta.path("usedMs").asLong(0);
            ((ObjectNode) keyMeta).put("usedMs", usedMs + added);
        }
        ObjectNode paused = progress.withObjectProperty("partPauseMs");
        paused.put(partId, paused.path(partId).asLong(0) + added);
    }

    private JsonNode partPauseKeyMeta(JsonNode progress, String partId, String audioKey) {
        JsonNode partMeta = progress.path("partPauseMeta").path(partId);
        if (!partMeta.isObject()) {
            return null;
        }
        if (partMeta.has("maxMs")) {
            return partMeta;
        }
        return partMeta.path(audioKey);
    }

    private OffsetDateTime progressStart(TestAttempt attempt, String bucket, String id) {
        ObjectNode progress = attempt.getProgress().deepCopy();
        ObjectNode node = progress.withObjectProperty(bucket);
        if (!node.hasNonNull(id)) {
            node.put(id, OffsetDateTime.now(clock).toString());
            attempt.setProgress(progress);
        }
        return OffsetDateTime.parse(node.path(id).asText());
    }

    private JsonNode findSection(TestAttempt attempt, UUID sectionId) {
        for (JsonNode item : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            if (sectionId.toString().equals(item.path("id").asText())) {
                return item;
            }
        }
        return null;
    }

    private JsonNode findPart(TestAttempt attempt, UUID partId) {
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            for (JsonNode part : section.path("parts")) {
                if (partId.toString().equals(part.path("id").asText())) {
                    return part;
                }
            }
        }
        return null;
    }

    private JsonNode findSectionForQuestion(TestAttempt attempt, JsonNode question) {
        String questionId = question.path("id").asText();
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            for (JsonNode item : section.path("questions")) {
                if (questionId.equals(item.path("id").asText())) {
                    return section;
                }
            }
        }
        return null;
    }

    private JsonNode findQuestion(JsonNode snapshot, UUID questionId) {
        for (JsonNode section : snapshot.path("sections")) {
            for (JsonNode question : section.path("questions")) {
                if (questionId.toString().equals(question.path("id").asText())) {
                    return question;
                }
            }
        }
        return null;
    }

    private Published requirePublished(String publicToken) {
        ExamTest test = tests.findByPublicToken(publicToken)
                .filter(item -> item.getStatus() == TestStatus.PUBLISHED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Тест не найден"));
        OffsetDateTime expires = test.getPublicTokenExpiresAt();
        if (expires != null && !OffsetDateTime.now(clock).isBefore(expires)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "LINK_EXPIRED", "Срок ссылки истёк");
        }
        TestVersion version = versions.findFirstByTestOrderByVersionNumberDesc(test)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Тест не найден"));
        return new Published(test, version);
    }

    private void ensureAvailable(JsonNode settings) {
        if (!AccessDates.ENABLED) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (settings.path("availableFrom").isTextual()) {
            OffsetDateTime from = OffsetDateTime.parse(settings.path("availableFrom").asText());
            if (now.isBefore(from)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "NOT_OPEN", "Тест ещё не открыт");
            }
        }
        if (settings.path("availableUntil").isTextual()) {
            OffsetDateTime until = OffsetDateTime.parse(settings.path("availableUntil").asText());
            if (now.isAfter(until)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "CLOSED", "Срок теста истёк");
            }
        }
    }

    private static boolean emailLooksValid(String email) {
        int at = email.indexOf('@');
        return at > 0 && at < email.length() - 1 && email.indexOf('@', at + 1) < 0;
    }

    private record Published(ExamTest test, TestVersion version) {
    }
}
