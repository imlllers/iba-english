package com.iba.testing.result;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.Answer;
import com.iba.testing.attempt.AnswerRepository;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.ResultMailer;
import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import com.iba.testing.scale.ScaleEvaluator;
import com.iba.testing.user.UserAccountRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import com.iba.testing.question.engine.QuestionEngines;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ReviewService {

    private final TestAttemptRepository attempts;
    private final AnswerRepository answers;
    private final UserAccountRepository users;
    private final ObjectMapper mapper;
    private final ScaleEvaluator scales;
    private final ResultMailer resultMailer;
    private final QuestionEngines engines;

    public ReviewService(TestAttemptRepository attempts, AnswerRepository answers, UserAccountRepository users, ObjectMapper mapper,
                         ScaleEvaluator scales, ResultMailer resultMailer, QuestionEngines engines) {
        this.attempts = attempts;
        this.answers = answers;
        this.users = users;
        this.mapper = mapper;
        this.scales = scales;
        this.resultMailer = resultMailer;
        this.engines = engines;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> list(UUID ownerId, UUID testId, AttemptStatus status, String level, String q, int page, int size) {
        String query = q == null || q.isBlank() ? null : q.trim();
        var result = attempts.searchForOwner(ownerId, testId, status, level, query,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "startedAt")));
        return new PageResponse<>(result.map(this::summary).toList(), page, size, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ObjectNode detail(UUID ownerId, UUID attemptId) {
        return full(requireOwned(ownerId, attemptId));
    }

    @Transactional
    public ObjectNode review(UUID ownerId, UUID attemptId, UUID questionId, BigDecimal awardedScore, String feedback, JsonNode criterionScores) {
        TestAttempt attempt = requireOwned(ownerId, attemptId);
        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_SUBMITTED", "Попытка ещё не отправлена");
        }
        Answer answer = answers.findByAttemptAndQuestionId(attempt, questionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Ответ не найден"));
        JsonNode question = findQuestion(attempt, questionId);
        BigDecimal max = effectiveMax(answer, question, examType(attempt));
        if (max.compareTo(BigDecimal.ZERO) > 0) {
            answer.setMaxScore(max);
        }
        boolean openMax = max.compareTo(BigDecimal.ZERO) <= 0;
        if (awardedScore == null || awardedScore.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Балл не может быть отрицательным");
        }
        if (!openMax && awardedScore.compareTo(max) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Балл должен быть от 0 до максимума");
        }
        if (feedback != null && feedback.length() > 5000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Комментарий не длиннее 5000 символов");
        }
        if (criterionScores != null && criterionScores.isObject() && question != null) {
            BigDecimal sum = BigDecimal.ZERO;
            for (JsonNode criterion : question.path("settings").path("criteria")) {
                BigDecimal cap = criterion.path("maxPoints").decimalValue();
                BigDecimal given = criterionScores.path(criterion.path("id").asText()).decimalValue();
                if (given.compareTo(BigDecimal.ZERO) < 0 || given.compareTo(cap) > 0) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Балл критерия вне диапазона");
                }
                sum = sum.add(given);
            }
            if (sum.compareTo(awardedScore) != 0 && question.path("settings").path("criteria").size() > 0) {
                awardedScore = sum;
            }
        }
        answer.setAwardedScore(awardedScore);
        if (openMax) {
            answer.setMaxScore(awardedScore);
        }
        answer.setFeedback(feedback == null ? "" : feedback.trim());
        answer.setCriterionScores(criterionScores);
        answer.setNeedsReview(false);
        answer.setReviewedBy(users.findById(ownerId).orElseThrow());
        answer.setReviewedAt(OffsetDateTime.now());
        recompute(attempt);
        return full(attempt);
    }

    @Transactional
    public ObjectNode setScaleScore(UUID ownerId, UUID attemptId, int index, BigDecimal score) {
        TestAttempt attempt = requireOwned(ownerId, attemptId);
        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_SUBMITTED", "Попытка ещё не отправлена");
        }
        JsonNode section = attempt.getTestVersion().getSettingsSnapshot().path("scoreScale").path("scale").path("sections").path(index);
        if (section.isMissingNode() || !"manual".equals(section.path("convert").path("method").asText(""))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "У этой секции балл считается автоматически");
        }
        ObjectNode manual = attempt.getScaleManual() instanceof ObjectNode existing ? existing.deepCopy() : mapper.createObjectNode();
        if (score == null) {
            manual.remove(String.valueOf(index));
        } else {
            double value = score.doubleValue();
            if (value < section.path("min").asDouble() - 1e-9 || value > section.path("max").asDouble() + 1e-9) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Балл вне диапазона шкалы");
            }
            manual.put(String.valueOf(index), score);
        }
        attempt.setScaleManual(manual);
        scales.apply(attempt, answers.findByAttempt(attempt));
        resultMailer.sendIfReady(attempt);
        return full(attempt);
    }

    private static String examType(TestAttempt attempt) {
        return attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("CUSTOM");
    }

    private BigDecimal effectiveMax(Answer answer, JsonNode question, String examType) {
        BigDecimal max = answer.getMaxScore() == null ? BigDecimal.ZERO : answer.getMaxScore();
        BigDecimal band = QuestionEngines.manualBandMax(examType);
        if (band != null && question != null && engines.manualEngine(question)
                && (max.compareTo(BigDecimal.ZERO) <= 0 || answer.isNeedsReview())) {
            return band;
        }
        return max;
    }

    private void recompute(TestAttempt attempt) {
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        boolean pending = false;
        for (Answer answer : answers.findByAttempt(attempt)) {
            if (answer.isNeedsReview() || answer.getAwardedScore() == null) {
                pending = true;
            } else {
                score = score.add(answer.getAwardedScore());
            }
            if (answer.getMaxScore() != null) {
                max = max.add(answer.getMaxScore());
            }
        }
        attempt.setScore(score.max(BigDecimal.ZERO));
        attempt.setMaxScore(max.max(BigDecimal.ZERO));
        attempt.setStatus(pending ? AttemptStatus.NEEDS_REVIEW : AttemptStatus.REVIEWED);
        scales.apply(attempt, answers.findByAttempt(attempt));
        resultMailer.sendIfReady(attempt);
    }

    private TestAttempt requireOwned(UUID ownerId, UUID attemptId) {
        TestAttempt attempt = attempts.findById(attemptId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
        if (!attempt.getTestVersion().getTest().getOwner().getId().equals(ownerId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена");
        }
        return attempt;
    }

    private ObjectNode summary(TestAttempt attempt) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", attempt.getId().toString());
        node.put("testId", attempt.getTestVersion().getTest().getId().toString());
        node.put("testTitle", attempt.getTestVersion().getTest().getTitle());
        if (attempt.getParticipantName() == null) {
            node.putNull("participantName");
        } else {
            node.put("participantName", attempt.getParticipantName());
        }
        if (attempt.getParticipantEmail() == null) {
            node.putNull("participantEmail");
        } else {
            node.put("participantEmail", attempt.getParticipantEmail());
        }
        node.put("status", attempt.getStatus().name());
        node.put("startedAt", attempt.getStartedAt().toString());
        if (attempt.getSubmittedAt() == null) {
            node.putNull("submittedAt");
        } else {
            node.put("submittedAt", attempt.getSubmittedAt().toString());
        }
        if (attempt.getScore() == null) {
            node.putNull("score");
        } else {
            node.put("score", attempt.getScore());
        }
        if (attempt.getMaxScore() == null) {
            node.putNull("maxScore");
        } else {
            node.put("maxScore", attempt.getMaxScore());
        }
        JsonNode scale = attempt.getScaleResult();
        if (scale == null || scale.isNull()) {
            node.putNull("scaleTotal");
            node.putNull("scaleLevel");
        } else {
            node.set("scaleTotal", scale.path("total"));
            node.set("scaleLevel", scale.path("level"));
        }
        if (attempt.getResultEmailedAt() == null) {
            node.putNull("resultEmailedAt");
        } else {
            node.put("resultEmailedAt", attempt.getResultEmailedAt().toString());
        }
        node.put("resultReady", ResultMailer.finalResult(attempt));
        return node;
    }

    private ObjectNode full(TestAttempt attempt) {
        ObjectNode node = summary(attempt);
        node.set("scaleResult", attempt.getScaleResult() == null ? mapper.nullNode() : attempt.getScaleResult());
        ArrayNode items = node.putArray("answers");
        Map<String, Answer> byQuestion = new LinkedHashMap<>();
        for (Answer answer : answers.findByAttempt(attempt)) {
            byQuestion.put(answer.getQuestionId().toString(), answer);
        }
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
                int slots = Math.max(1, questionSlotHint(question, examType));
                Answer answer = byQuestion.remove(question.path("id").asText());
                if (answer != null) {
                    ObjectNode item = answerNode(answer, question, section.path("title").asText(""), number, slots);
                    if (answer.isNeedsReview()) {
                        item.put("maxScore", effectiveMax(answer, question, examType));
                    }
                    items.add(item);
                }
                number += slots;
            }
        }
        for (Answer answer : byQuestion.values()) {
            items.add(answerNode(answer, null, "", number, 1));
            number += 1;
        }
        return node;
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

    private static int questionSlotHint(JsonNode question, String examType) {
        JsonNode blanks = question.path("answerKey").path("blanks");
        if (blanks.isObject() && blanks.size() > 0) {
            return blanks.size();
        }
        JsonNode errors = question.path("answerKey").path("errors");
        if (errors.isObject() && errors.size() > 0) {
            return errors.size();
        }
        JsonNode answersNode = question.path("answerKey").path("answers");
        if (answersNode.isObject() && answersNode.size() > 0) {
            return answersNode.size();
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

    private ObjectNode answerNode(Answer answer, JsonNode question, String sectionTitle, int number, int count) {
        ObjectNode item = mapper.createObjectNode();
        item.put("questionId", answer.getQuestionId().toString());
        item.put("sectionTitle", sectionTitle);
        item.put("number", number);
        item.put("count", count);
        if (question != null) {
            item.set("question", question);
            item.set("marks", engines.marks(question, answer.getAnswerData()));
        }
        item.set("answerData", answer.getAnswerData());
        if (answer.getAwardedScore() == null) {
            item.putNull("awardedScore");
        } else {
            item.put("awardedScore", answer.getAwardedScore());
        }
        if (answer.getMaxScore() == null) {
            item.putNull("maxScore");
        } else {
            item.put("maxScore", answer.getMaxScore());
        }
        item.put("feedback", answer.getFeedback() == null ? "" : answer.getFeedback());
        item.put("needsReview", answer.isNeedsReview());
        if (answer.getCriterionScores() == null) {
            item.putNull("criterionScores");
        } else {
            item.set("criterionScores", answer.getCriterionScores());
        }
        return item;
    }

    private JsonNode findQuestion(TestAttempt attempt, UUID questionId) {
        for (JsonNode section : attempt.getTestVersion().getContentSnapshot().path("sections")) {
            for (JsonNode question : section.path("questions")) {
                if (questionId.toString().equals(question.path("id").asText())) {
                    return question;
                }
            }
        }
        return null;
    }
}
