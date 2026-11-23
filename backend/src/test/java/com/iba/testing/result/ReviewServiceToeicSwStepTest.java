package com.iba.testing.result;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.attempt.AnswerRepository;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.scale.ScaleEvaluator;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.TestVersion;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.common.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceToeicSwStepTest {

    @Mock
    private TestAttemptRepository attempts;
    @Mock
    private QuestionEngines engines;
    @Mock
    private AnswerRepository answers;
    @Mock
    private UserAccountRepository users;
    @Mock
    private com.iba.testing.attempt.ResultMailer resultMailer;
    @Spy
    private ObjectMapper mapper = new ObjectMapper();
    @Spy
    private ScaleEvaluator scales = new ScaleEvaluator(new ObjectMapper());

    @InjectMocks
    private ReviewService reviews;

    @Test
    void toeicSwRejectsOffStepScore() {
        UUID ownerId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        TestAttempt attempt = attemptWithScale("toeic_sw", ownerId);
        attempt.setId(attemptId);
        attempt.setStatus(AttemptStatus.REVIEWED);
        when(attempts.findById(attemptId)).thenReturn(Optional.of(attempt));

        assertThrows(ApiException.class, () -> reviews.setScaleScore(ownerId, attemptId, 0, BigDecimal.valueOf(15)));
    }

    @Test
    void ieltsAllowsHalfStepWithoutToeicRule() {
        UUID ownerId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        TestAttempt attempt = attemptWithScale("ielts", ownerId);
        attempt.setId(attemptId);
        attempt.setStatus(AttemptStatus.REVIEWED);
        when(attempts.findById(attemptId)).thenReturn(Optional.of(attempt));
        when(answers.findByAttempt(any())).thenReturn(List.of());

        reviews.setScaleScore(ownerId, attemptId, 0, BigDecimal.valueOf(5.5));
    }

    private TestAttempt attemptWithScale(String scaleId, UUID ownerId) {
        ObjectNode scale = mapper.createObjectNode();
        scale.put("id", scaleId);
        ArrayNode sections = scale.putArray("sections");
        ObjectNode section = sections.addObject();
        section.put("min", 0);
        section.put("max", scaleId.equals("ielts") ? 9 : 200);
        section.put("step", scaleId.equals("ielts") ? 0.5 : 10);
        ObjectNode convert = section.putObject("convert");
        convert.put("method", "manual");

        ObjectNode settings = mapper.createObjectNode();
        ObjectNode binding = settings.putObject("scoreScale");
        binding.set("scale", scale);

        TestVersion version = new TestVersion();
        version.setSettingsSnapshot(settings);
        version.setContentSnapshot(mapper.createObjectNode().putArray("sections"));
        ExamTest test = new ExamTest();
        test.setId(UUID.randomUUID());
        UserAccount owner = new UserAccount();
        owner.setId(ownerId);
        test.setOwner(owner);
        version.setTest(test);

        TestAttempt attempt = new TestAttempt();
        attempt.setTestVersion(version);
        attempt.setStartedAt(OffsetDateTime.now());
        attempt.setStatus(AttemptStatus.REVIEWED);
        return attempt;
    }
}