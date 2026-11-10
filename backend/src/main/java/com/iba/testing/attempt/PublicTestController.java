package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.media.MediaService;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/public")
public class PublicTestController {

    private final PublicAttemptService attempts;
    private final MediaService media;

    public PublicTestController(PublicAttemptService attempts, MediaService media) {
        this.attempts = attempts;
        this.media = media;
    }

    @GetMapping("/tests/{publicToken}")
    public Object test(@PathVariable String publicToken) {
        return attempts.publishedTest(publicToken);
    }

    @PostMapping("/tests/{publicToken}/attempts")
    public Object start(@PathVariable String publicToken, @RequestBody(required = false) StartRequest request) {
        String name = request == null ? null : request.participantName();
        String email = request == null ? null : request.participantEmail();
        return attempts.start(publicToken, name, email);
    }

    @GetMapping("/attempts/{attemptToken}")
    public Object resume(@PathVariable String attemptToken) {
        return attempts.resume(attemptToken);
    }

    @PutMapping("/attempts/{attemptToken}/answers/{questionId}")
    public Object save(@PathVariable String attemptToken, @PathVariable UUID questionId, @RequestBody JsonNode answer) {
        return attempts.saveAnswer(attemptToken, questionId, answer);
    }

    @PostMapping("/attempts/{attemptToken}/answers/{questionId}/check")
    public Object check(@PathVariable String attemptToken, @PathVariable UUID questionId, @RequestBody JsonNode answer) {
        return attempts.checkAnswer(attemptToken, questionId, answer);
    }

    @PostMapping("/attempts/{attemptToken}/sections/{sectionId}/start")
    public Object startSection(@PathVariable String attemptToken, @PathVariable UUID sectionId) {
        return attempts.startSection(attemptToken, sectionId);
    }

    @PostMapping("/attempts/{attemptToken}/parts/{partId}/start")
    public Object startPart(@PathVariable String attemptToken, @PathVariable UUID partId) {
        return attempts.startPart(attemptToken, partId);
    }

    @PostMapping("/attempts/{attemptToken}/questions/{questionId}/start")
    public Object startQuestion(@PathVariable String attemptToken, @PathVariable UUID questionId) {
        return attempts.startQuestion(attemptToken, questionId);
    }

    @PostMapping("/attempts/{attemptToken}/submit")
    public Object submit(@PathVariable String attemptToken) {
        return attempts.submit(attemptToken);
    }

    @GetMapping("/attempts/{attemptToken}/result")
    public Object result(@PathVariable String attemptToken) {
        return attempts.result(attemptToken);
    }

    @GetMapping("/tests/{publicToken}/media/{mediaId}")
    public ResponseEntity<Resource> testMedia(@PathVariable String publicToken, @PathVariable UUID mediaId) {
        return file(media.publicTestFile(publicToken, mediaId));
    }

    @GetMapping("/attempts/{attemptToken}/media/{mediaId}")
    public ResponseEntity<Resource> attemptMedia(@PathVariable String attemptToken, @PathVariable UUID mediaId) {
        return file(media.attemptFile(attemptToken, mediaId));
    }

    @PostMapping("/attempts/{attemptToken}/media")
    public Object upload(@PathVariable String attemptToken, @RequestParam("file") MultipartFile file) {
        return media.storeForAttempt(attemptToken, file);
    }

    private ResponseEntity<Resource> file(MediaService.StoredFile file) {
        return file.toResponse();
    }

    public record StartRequest(String participantName, String participantEmail) {
    }
}
