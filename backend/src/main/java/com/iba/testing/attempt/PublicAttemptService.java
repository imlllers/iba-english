package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.Tokens;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.test.AccessDates;
import com.iba.testing.test.ListeningTiming;
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
import java.util.UUID;

@Service
public class PublicAttemptService {

    private static final int MAX_ANSWER_CHARS = 100_000;

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

    public PublicAttemptService(ExamTestRepository tests, TestVersionRepository versions, TestAttemptRepository attempts,
                                AnswerRepository answers, TestViews views, QuestionEngines grading, ObjectMapper mapper,
                                Clock clock, ScaleEvaluator scales, ResultMailer resultMailer,
                                ApplicationEventPublisher events) {
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
    }

    @Transactional(readOnly = true)
    public ObjectNode publishedTest(String publicToken) {
        Published published = requirePublished(publicToken);
        ensureAvailable(published.version().getSettingsSnapshot());
        return views.publicView(published.version().getContentSnapshot(), published.version().getSettingsSnapshot());
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
        response.set("test", views.publicView(published.version().getContentSnapshot(), settings));
        return response;
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
        int limit = section.path("timeLimitMinutes").asInt(0);
        if (limit <= 0) {
            node.putNull("endsAt");
            return node;
        }
        OffsetDateTime started = progressStart(attempt, "sections", sectionId.toString());
        node.put("endsAt", started.plusMinutes(limit).toString());
        return node;
    }

    @Transactional
    public ObjectNode startPart(String attemptToken, UUID partId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode part = findPart(attempt, partId);
        if (part == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Часть не найдена");
        }
        ObjectNode node = mapper.createObjectNode();
        int limit = part.path("timeLimitMinutes").asInt(0);
        if (limit <= 0) {
            node.putNull("endsAt");
            return node;
        }
        OffsetDateTime started = progressStart(attempt, "parts", partId.toString());
        node.put("endsAt", started.plusMinutes(limit).toString());
        return node;
    }

    @Transactional
    public ObjectNode startQuestion(String attemptToken, UUID questionId) {
        TestAttempt attempt = requireOpenAttempt(attemptToken);
        JsonNode question = requireQuestion(attempt, questionId);
        ObjectNode node = mapper.createObjectNode();
        int limit = questionLimit(attempt, question);
        if (limit <= 0) {
            node.putNull("endsAt");
            return node;
        }
        OffsetDateTime started = progressStart(attempt, "questions", questionId.toString());
        node.put("endsAt", started.plusSeconds(limit).toString());
        return node;
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
        node.set("test", views.publicView(attempt.getTestVersion().getContentSnapshot(), attempt.getTestVersion().getSettingsSnapshot()));
        var saved = node.putArray("answers");
        for (Answer answer : answers.findByAttempt(attempt)) {
            ObjectNode item = saved.addObject();
            item.put("questionId", answer.getQuestionId().toString());
            item.set("answerData", answer.getAnswerData());
        }
        return node;
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

    private ObjectNode participantResult(TestAttempt attempt, boolean reading) {
        JsonNode settings = attempt.getTestVersion().getSettingsSnapshot();
        boolean show = settings.path("showResultToParticipant").asBoolean(true);
        String detail = settings.path("resultDetail").asText("score_only");
        String explanationMode = settings.path("errorExplanationMode").asText("off");
        ObjectNode node = mapper.createObjectNode();
        node.put("status", attempt.getStatus().name());
        node.put("submitted", attempt.getStatus() != AttemptStatus.IN_PROGRESS);
        node.put("resultDetail", detail);
        if (!show) {
            node.put("scoreVisible", false);
            return node;
        }
        boolean reviewed = attempt.getStatus() == AttemptStatus.REVIEWED;
        boolean autoGraded = attempt.getStatus() == AttemptStatus.AUTO_GRADED;
        boolean needsReview = attempt.getStatus() == AttemptStatus.NEEDS_REVIEW;
        boolean finalScore = autoGraded || reviewed;
        node.put("scoreVisible", finalScore);
        node.put("reviewVisible", finalScore && "score_and_review".equals(detail));
        if (finalScore) {
            node.put("score", attempt.getScore());
            node.put("maxScore", attempt.getMaxScore());
            if (settings.path("showLevelToParticipant").asBoolean(true) && attempt.getScaleResult() != null) {
                node.set("scale", attempt.getScaleResult());
            }
        } else if (needsReview) {
            node.put("pendingReview", true);
        } else if (reading && attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            node.put("scoreVisible", false);
        }
        if (afterExplanation(explanationMode) && attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            appendExplanationItems(node, attempt);
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
        if (section == null || !section.path("timeLimitMinutes").isNumber() || section.path("timeLimitMinutes").asInt() <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "sections", section.path("id").asText());
        if (OffsetDateTime.now(clock).isAfter(started.plusMinutes(section.path("timeLimitMinutes").asInt()))) {
            throw new ApiException(HttpStatus.CONFLICT, "SECTION_EXPIRED", "Время секции истекло");
        }
    }

    private void ensurePartOpen(TestAttempt attempt, JsonNode question) {
        String partId = question.path("partId").asText("");
        if (partId.isBlank()) {
            return;
        }
        JsonNode part = findPart(attempt, UUID.fromString(partId));
        if (part == null || !part.path("timeLimitMinutes").isNumber() || part.path("timeLimitMinutes").asInt() <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "parts", partId);
        if (OffsetDateTime.now(clock).isAfter(started.plusMinutes(part.path("timeLimitMinutes").asInt()))) {
            throw new ApiException(HttpStatus.CONFLICT, "PART_EXPIRED", "Время части истекло");
        }
    }

    private int questionLimit(TestAttempt attempt, JsonNode question) {
        JsonNode section = findSectionForQuestion(attempt, question);
        String sectionType = section == null ? "" : section.path("sectionType").asText("");
        return ListeningTiming.questionLimit(attempt.getTestVersion().getSettingsSnapshot(), sectionType, question);
    }

    private void ensureQuestionOpen(TestAttempt attempt, JsonNode question) {
        int limit = questionLimit(attempt, question);
        if (limit <= 0) {
            return;
        }
        OffsetDateTime started = progressStart(attempt, "questions", question.path("id").asText());
        if (OffsetDateTime.now(clock).isAfter(started.plusSeconds(limit))) {
            throw new ApiException(HttpStatus.CONFLICT, "QUESTION_EXPIRED", "Время задания истекло");
        }
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
