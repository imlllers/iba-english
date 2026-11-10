package com.iba.testing.auth;

import com.iba.testing.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginThrottle {

    static final int MAX_FAILURES_PER_EMAIL = 5;
    static final int MAX_FAILURES_PER_IP = 30;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private record Failures(int count, Instant since) {
    }

    private final Map<String, Failures> failures = new ConcurrentHashMap<>();

    public void check(String email, String ip) {
        if (blocked("email:" + email, MAX_FAILURES_PER_EMAIL) || blocked("ip:" + ip, MAX_FAILURES_PER_IP)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Слишком много попыток входа. Попробуйте через 15 минут");
        }
    }

    public void failed(String email, String ip) {
        record("email:" + email);
        record("ip:" + ip);
    }

    public void succeeded(String email) {
        failures.remove("email:" + email);
    }

    private boolean blocked(String key, int limit) {
        Failures entry = failures.get(key);
        if (entry == null) {
            return false;
        }
        if (entry.since().plus(WINDOW).isBefore(Instant.now())) {
            failures.remove(key, entry);
            return false;
        }
        return entry.count() >= limit;
    }

    private void record(String key) {
        Instant now = Instant.now();
        failures.compute(key, (k, entry) -> entry == null || entry.since().plus(WINDOW).isBefore(now)
                ? new Failures(1, now)
                : new Failures(entry.count() + 1, entry.since()));
    }
}
