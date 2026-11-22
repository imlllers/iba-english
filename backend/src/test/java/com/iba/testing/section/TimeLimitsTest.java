package com.iba.testing.section;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TimeLimitsTest {

    @Test
    void positiveSecondsClearMinutes() {
        Holder holder = new Holder(7, 390);
        TimeLimits.apply(390, 0, holder::setSeconds, holder::setMinutes);
        assertEquals(390, holder.seconds);
        assertNull(holder.minutes);
    }

    @Test
    void zeroSecondsClearBoth() {
        Holder holder = new Holder(7, 390);
        TimeLimits.apply(0, 0, holder::setSeconds, holder::setMinutes);
        assertNull(holder.seconds);
        assertNull(holder.minutes);
    }

    @Test
    void nullSecondsAndZeroMinutesClearBoth() {
        Holder holder = new Holder(7, 390);
        TimeLimits.apply(null, 0, holder::setSeconds, holder::setMinutes);
        assertNull(holder.seconds);
        assertNull(holder.minutes);
    }

    @Test
    void patchLeavesLimitsWhenTimeFieldsAbsent() {
        Holder holder = new Holder(7, 390);
        ObjectNode body = new ObjectMapper().createObjectNode().put("title", "Section");
        TimeLimits.applyPatch(body, null, null, holder::setSeconds, holder::setMinutes);
        assertEquals(7, holder.minutes);
        assertEquals(390, holder.seconds);
    }

    @Test
    void patchClearsWhenZeroSent() {
        Holder holder = new Holder(7, 390);
        ObjectNode body = new ObjectMapper().createObjectNode()
                .put("timeLimitMinutes", 0)
                .put("timeLimitSeconds", 0);
        TimeLimits.applyPatch(body, 0, 0, holder::setSeconds, holder::setMinutes);
        assertNull(holder.seconds);
        assertNull(holder.minutes);
    }

    private static final class Holder {
        Integer minutes;
        Integer seconds;

        Holder(Integer minutes, Integer seconds) {
            this.minutes = minutes;
            this.seconds = seconds;
        }

        void setMinutes(Integer value) {
            minutes = value;
        }

        void setSeconds(Integer value) {
            seconds = value;
        }
    }
}
