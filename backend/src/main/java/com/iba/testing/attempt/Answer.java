package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "answers")
public class Answer {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    private TestAttempt attempt;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_data", nullable = false)
    private JsonNode answerData;

    @Column(name = "awarded_score", precision = 10, scale = 2)
    private BigDecimal awardedScore;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore;

    @Column
    private String feedback;

    @Column(name = "needs_review", nullable = false)
    private boolean needsReview;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "criterion_scores")
    private JsonNode criterionScores;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserAccount reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public TestAttempt getAttempt() {
        return attempt;
    }

    public void setAttempt(TestAttempt attempt) {
        this.attempt = attempt;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public void setQuestionId(UUID questionId) {
        this.questionId = questionId;
    }

    public JsonNode getAnswerData() {
        return answerData;
    }

    public void setAnswerData(JsonNode answerData) {
        this.answerData = answerData;
    }

    public BigDecimal getAwardedScore() {
        return awardedScore;
    }

    public void setAwardedScore(BigDecimal awardedScore) {
        this.awardedScore = awardedScore;
    }

    public BigDecimal getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(BigDecimal maxScore) {
        this.maxScore = maxScore;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public boolean isNeedsReview() {
        return needsReview;
    }

    public void setNeedsReview(boolean needsReview) {
        this.needsReview = needsReview;
    }

    public JsonNode getCriterionScores() {
        return criterionScores;
    }

    public void setCriterionScores(JsonNode criterionScores) {
        this.criterionScores = criterionScores;
    }

    public UserAccount getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(UserAccount reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public OffsetDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(OffsetDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
