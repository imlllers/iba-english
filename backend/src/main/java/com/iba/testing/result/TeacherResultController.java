package com.iba.testing.result;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.ResultMailer;
import com.iba.testing.security.CurrentUser;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
public class TeacherResultController {

    private final ReviewService reviews;
    private final ResultMailer resultMailer;

    public TeacherResultController(ReviewService reviews, ResultMailer resultMailer) {
        this.reviews = reviews;
        this.resultMailer = resultMailer;
    }

    @GetMapping("/results")
    public Object list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) UUID testId,
                       @RequestParam(required = false) AttemptStatus status,
                       @RequestParam(required = false) String level,
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size) {
        return reviews.list(CurrentUser.require().getId(), testId, status, level == null || level.isBlank() ? null : level, q, page, Math.min(size, 100));
    }

    @GetMapping("/attempts/{id}")
    public Object detail(@PathVariable UUID id) {
        return reviews.detail(CurrentUser.require().getId(), id);
    }

    @PutMapping("/attempts/{id}/answers/{questionId}/review")
    public Object review(@PathVariable UUID id, @PathVariable UUID questionId, @RequestBody ReviewRequest request) {
        return reviews.review(CurrentUser.require().getId(), id, questionId, request.awardedScore(), request.feedback(), request.criterionScores());
    }

    @PutMapping("/attempts/{id}/scale/{index}")
    public Object scaleScore(@PathVariable UUID id, @PathVariable int index, @RequestBody ScaleScoreRequest request) {
        return reviews.setScaleScore(CurrentUser.require().getId(), id, index, request.score());
    }

    @PostMapping("/attempts/{id}/send-result")
    public Object sendResult(@PathVariable UUID id) {
        UUID ownerId = CurrentUser.require().getId();
        resultMailer.sendNow(ownerId, id);
        return reviews.detail(ownerId, id);
    }

    public record ScaleScoreRequest(BigDecimal score) {
    }

    public record ReviewRequest(@NotNull BigDecimal awardedScore, String feedback, JsonNode criterionScores) {
    }
}
