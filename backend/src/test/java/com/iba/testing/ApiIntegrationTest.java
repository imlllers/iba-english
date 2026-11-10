package com.iba.testing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.invite.InviteCodeRepository;
import com.iba.testing.mail.MailService;
import com.iba.testing.mail.SentMail;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import com.iba.testing.question.engine.QuestionEngines;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ApiIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.media-dir", () -> tempDir());
        registry.add("app.admin.email", () -> "admin@test.local");
        registry.add("app.admin.password", () -> "admin-password");
        registry.add("app.admin.login-secret", () -> "test-admin-secret");
        registry.add("app.mail.enabled", () -> "true");
        registry.add("app.mail.host", () -> "smtp.test.local");
        registry.add("app.mail.username", () -> "mailer");
        registry.add("app.mail.password", () -> "smtp-secret");
        registry.add("app.mail.from-email", () -> "noreply@test.local");
        registry.add("spring.autoconfigure.exclude",
                () -> "org.springframework.boot.autoconfigure.session.SessionAutoConfiguration");
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private QuestionEngines engines;

    @Autowired
    private InviteCodeRepository inviteCodes;

    @Autowired
    private MailService mail;

    private MockHttpSession teacher;
    private MockHttpSession other;
    private MockHttpSession admin;

    @BeforeEach
    void sessions() throws Exception {
        mail.setCaptureOnly(true);
        mail.drainOutbox();
        admin = login("admin@test.local", "admin-password");
        teacher = teacherSession();
        other = teacherSession();
    }

    @Test
    void rolesAreEnforced() throws Exception {
        mvc.perform(get("/api/teacher/tests")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/teacher/tests").session(admin)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").session(teacher)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").session(admin)).andExpect(status().isOk());
    }

    @Test
    void teachersCannotSeeEachOthersTests() throws Exception {
        JsonNode test = createTest(teacher);
        String id = test.path("id").asText();
        mvc.perform(get("/api/teacher/tests/" + id).session(other)).andExpect(status().isNotFound());
        mvc.perform(json(put("/api/teacher/tests/" + id), other,
                "{\"title\":\"x\",\"description\":\"\",\"settings\":{}}")).andExpect(status().isNotFound());
        JsonNode list = read(mvc.perform(get("/api/teacher/tests").session(other)).andExpect(status().isOk()).andReturn());
        assertEquals(0, list.path("total").asInt());
    }

    @Test
    void publishedAttemptIsGradedOnceAndHidesAnswers() throws Exception {
        JsonNode test = createTest(teacher);
        String id = test.path("id").asText();
        String section = test.path("sections").get(0).path("id").asText();
        addQuestion(teacher, id, section, "SINGLE_CHOICE");
        JsonNode detail = addQuestion(teacher, id, section, "SHORT_WRITTEN");
        JsonNode choice = detail.path("sections").get(0).path("questions").get(0);
        JsonNode essay = detail.path("sections").get(0).path("questions").get(1);

        JsonNode published = read(mvc.perform(post("/api/teacher/tests/" + id + "/publish").session(teacher).with(csrf()))
                .andExpect(status().isOk()).andReturn());
        assertEquals("PUBLISHED", published.path("status").asText());
        assertEquals(1, published.path("publishedVersion").asInt());
        String token = published.path("publicToken").asText();

        String publicBody = mvc.perform(get("/api/public/tests/" + token)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(publicBody.contains("answerKey"));
        assertFalse(publicBody.contains("correctOptionId"));

        JsonNode attempt = read(mvc.perform(json(post("/api/public/tests/" + token + "/attempts"), null, "{\"participantName\":\"Ann\",\"participantEmail\":\"ann@example.com\"}"))
                .andExpect(status().isOk()).andReturn());
        String attemptToken = attempt.path("attemptToken").asText();
        String correct = choice.path("answerKey").path("correctOptionId").asText();
        mvc.perform(json(put("/api/public/attempts/" + attemptToken + "/answers/" + choice.path("id").asText()), null,
                "{\"optionId\":\"" + correct + "\"}")).andExpect(status().isOk());
        mvc.perform(json(put("/api/public/attempts/" + attemptToken + "/answers/" + essay.path("id").asText()), null,
                "{\"text\":\"Public transport should be free because it reduces traffic.\"}")).andExpect(status().isOk());

        JsonNode first = read(mvc.perform(post("/api/public/attempts/" + attemptToken + "/submit").with(csrf()))
                .andExpect(status().isOk()).andReturn());
        assertEquals("NEEDS_REVIEW", first.path("status").asText());
        assertFalse(first.path("scoreVisible").asBoolean());
        JsonNode second = read(mvc.perform(post("/api/public/attempts/" + attemptToken + "/submit").with(csrf()))
                .andExpect(status().isOk()).andReturn());
        assertEquals("NEEDS_REVIEW", second.path("status").asText());
        mvc.perform(json(put("/api/public/attempts/" + attemptToken + "/answers/" + choice.path("id").asText()), null, "{}"))
                .andExpect(status().isConflict());

        JsonNode results = read(mvc.perform(get("/api/teacher/results").session(teacher)).andExpect(status().isOk()).andReturn());
        String attemptId = results.path("items").get(0).path("id").asText();
        mvc.perform(get("/api/teacher/attempts/" + attemptId).session(other)).andExpect(status().isNotFound());
        ObjectNode review = mapper.createObjectNode().put("awardedScore", 5).put("feedback", "Good");
        review.putObject("criterionScores").put("content", 3).put("language", 2);
        JsonNode reviewed = read(mvc.perform(json(put("/api/teacher/attempts/" + attemptId + "/answers/" + essay.path("id").asText() + "/review"),
                teacher, review.toString())).andExpect(status().isOk()).andReturn());
        assertEquals("REVIEWED", reviewed.path("status").asText());
        assertEquals(6.0, reviewed.path("score").asDouble());

        JsonNode result = read(mvc.perform(get("/api/public/attempts/" + attemptToken + "/result")).andExpect(status().isOk()).andReturn());
        assertTrue(result.path("scoreVisible").asBoolean());
    }

    @Test
    void publicationRejectsIncompleteQuestionsButDraftSaves() throws Exception {
        JsonNode test = createTest(teacher);
        String id = test.path("id").asText();
        JsonNode detail = addQuestion(teacher, id, test.path("sections").get(0).path("id").asText(), "SINGLE_CHOICE");
        ObjectNode question = (ObjectNode) detail.path("sections").get(0).path("questions").get(0).deepCopy();
        question.putObject("answerKey");
        mvc.perform(json(put("/api/teacher/tests/" + id + "/questions/" + question.path("id").asText()), teacher, question.toString()))
                .andExpect(status().isOk());
        JsonNode error = read(mvc.perform(post("/api/teacher/tests/" + id + "/publish").session(teacher).with(csrf()))
                .andExpect(status().isBadRequest()).andReturn());
        assertTrue(error.path("message").asText().contains("Отметьте верный вариант"));
    }

    @Test
    void addsUpToFortyQuestionsOfOneType() throws Exception {
        JsonNode test = createTest(teacher);
        String id = test.path("id").asText();
        String section = test.path("sections").get(0).path("id").asText();
        String path = "/api/teacher/tests/" + id + "/sections/" + section + "/questions";
        JsonNode detail = read(mvc.perform(json(post(path), teacher, "{\"type\":\"SINGLE_CHOICE\",\"count\":40}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals(40, detail.path("sections").get(0).path("questions").size());
        mvc.perform(json(post(path), teacher, "{\"type\":\"SINGLE_CHOICE\",\"count\":41}")).andExpect(status().isBadRequest());
    }

    @Test
    void unknownQuestionTypeIsRejected() throws Exception {
        JsonNode test = createTest(teacher);
        mvc.perform(json(post("/api/teacher/tests/" + test.path("id").asText() + "/sections/"
                        + test.path("sections").get(0).path("id").asText() + "/questions"), teacher, "{\"type\":\"DRAGON\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fakeFilesAreRejected() throws Exception {
        MockMultipartFile image = new MockMultipartFile("file", "photo.png", "image/png", "hello".getBytes());
        mvc.perform(multipart("/api/teacher/media").file(image).session(teacher).with(csrf())).andExpect(status().isBadRequest());
        MockMultipartFile script = new MockMultipartFile("file", "run.sh", "text/x-sh", "#!/bin/sh".getBytes());
        mvc.perform(multipart("/api/teacher/media").file(script).session(teacher).with(csrf())).andExpect(status().isBadRequest());
    }

    @Test
    void linkRotationRevokeAndDelete() throws Exception {
        String id = publishedTest(teacher);
        String first = read(mvc.perform(get("/api/teacher/tests/" + id).session(teacher)).andReturn()).path("publicToken").asText();
        String second = read(mvc.perform(post("/api/teacher/tests/" + id + "/link/rotate").session(teacher).with(csrf()))
                .andExpect(status().isOk()).andReturn()).path("publicToken").asText();
        assertNotEquals(first, second);
        mvc.perform(get("/api/public/tests/" + first)).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/tests/" + second)).andExpect(status().isOk());
        mvc.perform(post("/api/teacher/tests/" + id + "/link/rotate").session(other).with(csrf())).andExpect(status().isNotFound());

        JsonNode revoked = read(mvc.perform(post("/api/teacher/tests/" + id + "/link/revoke").session(teacher).with(csrf()))
                .andExpect(status().isOk()).andReturn());
        assertEquals("PUBLISHED", revoked.path("status").asText());
        assertEquals("CLOSED", revoked.path("accessStatus").asText());
        mvc.perform(get("/api/public/tests/" + second)).andExpect(status().isNotFound());
        JsonNode reopened = read(mvc.perform(post("/api/teacher/tests/" + id + "/link/rotate").session(teacher).with(csrf()))
                .andExpect(status().isOk()).andReturn());
        assertEquals("OPEN", reopened.path("accessStatus").asText());

        mvc.perform(delete("/api/teacher/tests/" + id).session(teacher).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/teacher/tests/" + id).session(teacher)).andExpect(status().isNotFound());
    }

    @Test
    void attemptResumesUntilSubmitted() throws Exception {
        String id = publishedTest(teacher);
        JsonNode detail = read(mvc.perform(get("/api/teacher/tests/" + id).session(teacher)).andReturn());
        String token = detail.path("publicToken").asText();
        String section = detail.path("sections").get(0).path("id").asText();
        String attemptToken = read(mvc.perform(json(post("/api/public/tests/" + token + "/attempts"), null, "{\"participantName\":\"Ann\",\"participantEmail\":\"ann@example.com\"}"))
                .andExpect(status().isOk()).andReturn()).path("attemptToken").asText();
        mvc.perform(post("/api/public/attempts/" + attemptToken + "/sections/" + section + "/start").with(csrf())).andExpect(status().isOk());
        String resumed = mvc.perform(get("/api/public/attempts/" + attemptToken)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(resumed.contains("answerKey"));
        mvc.perform(get("/api/public/attempts/not-a-token")).andExpect(status().isNotFound());
        mvc.perform(post("/api/public/attempts/" + attemptToken + "/submit").with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/public/attempts/" + attemptToken)).andExpect(status().isConflict());
    }

    @Test
    void adminSettingsStayWithinServerLimit() throws Exception {
        mvc.perform(json(put("/api/admin/settings"), admin, "{\"maxUploadBytes\":999999999999,\"attemptRetentionDays\":0,\"linkLifetimeHours\":12}"))
                .andExpect(status().isBadRequest());
        mvc.perform(json(put("/api/admin/settings"), admin, "{\"maxUploadBytes\":1048576,\"attemptRetentionDays\":-1,\"linkLifetimeHours\":12}"))
                .andExpect(status().isBadRequest());
        mvc.perform(json(put("/api/admin/settings"), admin, "{\"maxUploadBytes\":1048576,\"attemptRetentionDays\":0,\"linkLifetimeHours\":-1}"))
                .andExpect(status().isBadRequest());
        JsonNode saved = read(mvc.perform(json(put("/api/admin/settings"), admin, "{\"maxUploadBytes\":1048576,\"attemptRetentionDays\":30,\"linkLifetimeHours\":6}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals(1048576, saved.path("maxUploadBytes").asLong());
        assertEquals(12, saved.path("linkLifetimeHours").asInt(), "срок ссылки фиксирован, администратор его не меняет");
        mvc.perform(json(put("/api/admin/settings"), teacher, "{\"maxUploadBytes\":1048576,\"attemptRetentionDays\":30,\"linkLifetimeHours\":12}"))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/admin/settings"), admin, "{\"maxUploadBytes\":20971520,\"attemptRetentionDays\":0,\"linkLifetimeHours\":12}"))
                .andExpect(status().isOk());
    }

    @Test
    void registerWithInviteRequiresEmailVerification() throws Exception {
        JsonNode invite = read(mvc.perform(json(post("/api/admin/invites"), admin, "{\"validDays\":7}"))
                .andExpect(status().isOk()).andReturn());
        String code = invite.path("code").asText();
        assertFalse(code.isBlank());
        assertEquals(1, read(mvc.perform(get("/api/admin/invites").session(admin)).andExpect(status().isOk()).andReturn()).size());

        String email = "r" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        ObjectNode body = mapper.createObjectNode()
                .put("inviteCode", code)
                .put("email", email)
                .put("displayName", "Registered Teacher")
                .put("password", "register-password");
        mail.drainOutbox();
        mvc.perform(json(post("/api/auth/register"), null, body.toString())).andExpect(status().isOk());
        assertEquals(0, read(mvc.perform(get("/api/admin/invites").session(admin)).andExpect(status().isOk()).andReturn()).size());
        mvc.perform(json(post("/api/auth/login"), null, "{\"email\":\"" + email + "\",\"password\":\"register-password\"}"))
                .andExpect(status().isForbidden());

        java.util.List<SentMail> sent = mail.drainOutbox();
        assertEquals(1, sent.size());
        String token = tokenFromMail(sent.getFirst(), "/verify-email?token=");
        mvc.perform(json(post("/api/auth/verify-email"), null, "{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk());
        login(email, "register-password");

        mvc.perform(json(post("/api/auth/register"), null, body.toString())).andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsInvalidExpiredAndRevokedInvites() throws Exception {
        ObjectNode bad = mapper.createObjectNode()
                .put("inviteCode", "NOPECODE12")
                .put("email", "bad" + UUID.randomUUID().toString().substring(0, 6) + "@test.local")
                .put("displayName", "Nobody")
                .put("password", "register-password");
        mvc.perform(json(post("/api/auth/register"), null, bad.toString())).andExpect(status().isBadRequest());

        JsonNode invite = read(mvc.perform(json(post("/api/admin/invites"), admin, "{\"validDays\":1}"))
                .andExpect(status().isOk()).andReturn());
        String id = invite.path("id").asText();
        String code = invite.path("code").asText();
        mvc.perform(post("/api/admin/invites/" + id + "/revoke").session(admin).with(csrf())).andExpect(status().isOk());
        ObjectNode revoked = mapper.createObjectNode()
                .put("inviteCode", code)
                .put("email", "rev" + UUID.randomUUID().toString().substring(0, 6) + "@test.local")
                .put("displayName", "Revoked")
                .put("password", "register-password");
        mvc.perform(json(post("/api/auth/register"), null, revoked.toString())).andExpect(status().isBadRequest());

        JsonNode expiredInvite = read(mvc.perform(json(post("/api/admin/invites"), admin, "{\"validDays\":1}"))
                .andExpect(status().isOk()).andReturn());
        inviteCodes.findById(UUID.fromString(expiredInvite.path("id").asText())).ifPresent(row -> {
            row.setExpiresAt(java.time.OffsetDateTime.now().minusDays(1));
            inviteCodes.save(row);
        });
        ObjectNode expired = mapper.createObjectNode()
                .put("inviteCode", expiredInvite.path("code").asText())
                .put("email", "exp" + UUID.randomUUID().toString().substring(0, 6) + "@test.local")
                .put("displayName", "Expired")
                .put("password", "register-password");
        mvc.perform(json(post("/api/auth/register"), null, expired.toString())).andExpect(status().isBadRequest());
    }

    @Test
    void profileAndPasswordChanges() throws Exception {
        String email = "p" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        ObjectNode body = mapper.createObjectNode().put("email", email).put("displayName", "Teacher")
                .put("password", "teacher-password").put("role", "TEACHER");
        mvc.perform(json(post("/api/admin/users"), admin, body.toString())).andExpect(status().isOk());
        MockHttpSession session = login(email, "teacher-password");

        JsonNode profile = read(mvc.perform(json(put("/api/auth/profile"), session, "{\"displayName\":\"Anna Petrova\"}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals("Anna Petrova", profile.path("displayName").asText());
        mvc.perform(json(post("/api/auth/password"), session, "{\"currentPassword\":\"wrong-password\",\"newPassword\":\"new-password-1\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(json(post("/api/auth/password"), session, "{\"currentPassword\":\"teacher-password\",\"newPassword\":\"new-password-1\"}"))
                .andExpect(status().isOk());
        login(email, "new-password-1");
    }

    @Test
    void forgotPasswordSendsMailAndAllowsReset() throws Exception {
        String email = "f" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        ObjectNode user = mapper.createObjectNode().put("email", email).put("displayName", "Forgot")
                .put("password", "old-password-1").put("role", "TEACHER");
        mvc.perform(json(post("/api/admin/users"), admin, user.toString())).andExpect(status().isOk());

        mail.drainOutbox();

        mvc.perform(json(post("/api/auth/forgot-password"), null, "{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(json(post("/api/auth/forgot-password"), null, "{\"email\":\"missing@test.local\"}"))
                .andExpect(status().isOk());

        java.util.List<SentMail> sent = mail.drainOutbox();
        assertEquals(1, sent.size());
        assertEquals(email, sent.getFirst().to());
        String token = tokenFromMail(sent.getFirst(), "/reset-password?token=");

        mvc.perform(json(post("/api/auth/reset-password"), null,
                "{\"token\":\"" + token + "\",\"password\":\"new-password-9\"}")).andExpect(status().isOk());
        login(email, "new-password-9");
        mvc.perform(json(post("/api/auth/reset-password"), null,
                "{\"token\":\"" + token + "\",\"password\":\"another-password-9\"}")).andExpect(status().isBadRequest());
    }

    private String tokenFromMail(SentMail sent, String marker) {
        String link = sent.text().lines()
                .filter(line -> line.contains(marker))
                .findFirst()
                .orElseThrow();
        String token = link.substring(link.indexOf("token=") + 6).trim();
        assertFalse(token.isBlank());
        return token;
    }

    private String publishedTest(MockHttpSession session) throws Exception {
        JsonNode test = createTest(session);
        String id = test.path("id").asText();
        addQuestion(session, id, test.path("sections").get(0).path("id").asText(), "SINGLE_CHOICE");
        mvc.perform(post("/api/teacher/tests/" + id + "/publish").session(session).with(csrf())).andExpect(status().isOk());
        return id;
    }

    private MockHttpSession teacherSession() throws Exception {
        String email = "t" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        ObjectNode body = mapper.createObjectNode().put("email", email).put("displayName", "Teacher")
                .put("password", "teacher-password").put("role", "TEACHER");
        mvc.perform(json(post("/api/admin/users"), admin, body.toString())).andExpect(status().isOk());
        return login(email, "teacher-password");
    }

    private MockHttpSession login(String email, String password) throws Exception {
        MockHttpSession session = new MockHttpSession();
        ObjectNode body = mapper.createObjectNode().put("email", email).put("password", password).put("adminSecret", "test-admin-secret");
        mvc.perform(json(post("/api/auth/login"), session, body.toString())).andExpect(status().isOk());
        return session;
    }

    @Test
    void adminLoginRequiresSecretAndLoginIsThrottled() throws Exception {
        mvc.perform(json(post("/api/auth/login"), null, "{\"email\":\"admin@test.local\",\"password\":\"admin-password\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(json(post("/api/auth/login"), null,
                        "{\"email\":\"admin@test.local\",\"password\":\"admin-password\",\"adminSecret\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
        login("admin@test.local", "admin-password");

        String email = "throttle" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
        mvc.perform(json(post("/api/admin/users"), admin, mapper.createObjectNode()
                        .put("email", email).put("displayName", "Throttle").put("password", "throttle-password").put("role", "TEACHER").toString()))
                .andExpect(status().isOk());
        String wrong = "{\"email\":\"" + email + "\",\"password\":\"bad-password\"}";
        for (int i = 0; i < 5; i++) {
            mvc.perform(json(post("/api/auth/login"), null, wrong)).andExpect(status().isUnauthorized());
        }
        mvc.perform(json(post("/api/auth/login"), null, "{\"email\":\"" + email + "\",\"password\":\"throttle-password\"}"))
                .andExpect(status().isTooManyRequests());
    }

    private JsonNode createTest(MockHttpSession session) throws Exception {
        return read(mvc.perform(json(post("/api/teacher/tests"), session, "{\"title\":\"Reading check\",\"description\":\"\"}"))
                .andExpect(status().isOk()).andReturn());
    }

    private JsonNode addQuestion(MockHttpSession session, String testId, String sectionId, String type) throws Exception {
        JsonNode detail = read(mvc.perform(json(post("/api/teacher/tests/" + testId + "/sections/" + sectionId + "/questions"), session,
                "{\"type\":\"" + type + "\"}")).andExpect(status().isOk()).andReturn());
        JsonNode questions = detail.path("sections").get(0).path("questions");
        String questionId = questions.get(questions.size() - 1).path("id").asText();
        Question demo = new Question();
        engines.applyDemoDefaults(demo, QuestionType.valueOf(type));
        ObjectNode body = mapper.createObjectNode().put("type", type).put("required", true);
        body.set("promptContent", demo.getPromptContent());
        body.set("options", demo.getOptions());
        body.set("answerKey", demo.getAnswerKey());
        body.set("scoringConfig", demo.getScoringConfig());
        body.set("settings", demo.getSettings());
        mvc.perform(json(put("/api/teacher/tests/" + testId + "/questions/" + questionId), session, body.toString()))
                .andExpect(status().isOk());
        return read(mvc.perform(get("/api/teacher/tests/" + testId).session(session)).andExpect(status().isOk()).andReturn());
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, MockHttpSession session, String body) {
        MockHttpServletRequestBuilder request = builder.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf());
        return session == null ? request : request.session(session);
    }

    private JsonNode read(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    private static String tempDir() {
        try {
            return Files.createTempDirectory("iba-media").toString();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
