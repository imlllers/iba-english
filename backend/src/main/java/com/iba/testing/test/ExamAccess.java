package com.iba.testing.test;

import com.iba.testing.common.exception.ApiException;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ExamAccess {

    private final ExamTestRepository tests;
    private final UserAccountRepository users;

    public ExamAccess(ExamTestRepository tests, UserAccountRepository users) {
        this.tests = tests;
        this.users = users;
    }

    public ExamTest requireOwned(UUID testId, UUID ownerId) {
        ExamTest test = tests.findById(testId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Тест не найден"));
        if (!test.getOwner().getId().equals(ownerId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Тест не найден");
        }
        return test;
    }

    public UserAccount requireUser(UUID id) {
        return users.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Нужно войти"));
    }
}
