package com.iba.testing.question.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record GradeOutcome(BigDecimal awarded, BigDecimal max, boolean needsReview) {

    public GradeOutcome {
        awarded = awarded == null ? null : awarded.setScale(2, RoundingMode.HALF_UP);
        max = max.setScale(2, RoundingMode.HALF_UP);
    }

    public static GradeOutcome auto(BigDecimal awarded, BigDecimal max) {
        return new GradeOutcome(awarded.min(max), max, false);
    }

    public static GradeOutcome review(BigDecimal max) {
        return new GradeOutcome(null, max, true);
    }
}
