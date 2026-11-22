package com.iba.testing.scale;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScaleEvaluatorRoundTest {

    @Test
    void roundToHalfNearest() {
        assertEquals(6.0, ScaleEvaluator.roundTo(6.125, 0.5, "nearest"), 1e-9);
        assertEquals(6.5, ScaleEvaluator.roundTo(6.25, 0.5, "nearest"), 1e-9);
        assertEquals(6.5, ScaleEvaluator.roundTo(6.375, 0.5, "nearest"), 1e-9);
        assertEquals(7.0, ScaleEvaluator.roundTo(6.75, 0.5, "nearest"), 1e-9);
        assertEquals(7.0, ScaleEvaluator.roundTo(6.875, 0.5, "nearest"), 1e-9);
        assertEquals(5.0, ScaleEvaluator.roundTo(5.125, 0.5, "nearest"), 1e-9);
        assertEquals(5.5, ScaleEvaluator.roundTo(5.25, 0.5, "nearest"), 1e-9);
    }
}