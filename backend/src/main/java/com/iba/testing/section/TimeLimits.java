package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.function.Consumer;

public final class TimeLimits {

    private TimeLimits() {
    }

    public static void applyPatch(
            JsonNode body,
            Integer seconds,
            Integer minutes,
            Consumer<Integer> setSeconds,
            Consumer<Integer> setMinutes) {
        if (!RequestFields.present(body, "timeLimitSeconds") && !RequestFields.present(body, "timeLimitMinutes")) {
            return;
        }
        apply(seconds, minutes, setSeconds, setMinutes);
    }

    public static void apply(Integer seconds, Integer minutes, Consumer<Integer> setSeconds, Consumer<Integer> setMinutes) {
        if (seconds != null) {
            if (seconds < 0 || seconds > 36000) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Лимит – от 0 до 36000 секунд");
            }
            if (seconds > 0) {
                setSeconds.accept(seconds);
                setMinutes.accept(null);
            } else {
                setSeconds.accept(null);
                setMinutes.accept(null);
            }
            return;
        }
        if (minutes != null) {
            if (minutes < 0 || minutes > 600) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Лимит – от 0 до 600 минут");
            }
            setMinutes.accept(minutes == 0 ? null : minutes);
            if (minutes == 0) {
                setSeconds.accept(null);
            }
        }
    }
}
