package com.iba.testing.share;

import com.iba.testing.media.MediaService;
import com.iba.testing.security.CurrentUser;
import com.iba.testing.share.dto.ShareTestRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
public class TeacherShareController {

    private final TestShareService shares;

    public TeacherShareController(TestShareService shares) {
        this.shares = shares;
    }

    @GetMapping("/colleagues")
    public Object colleagues(@RequestParam(defaultValue = "") String q,
                             @RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "20") int size) {
        return shares.colleagues(CurrentUser.require().getId(), q, page, size);
    }

    @PostMapping("/tests/{id}/share")
    public Object share(@PathVariable UUID id, @Valid @RequestBody ShareTestRequest request) {
        return shares.share(CurrentUser.require().getId(), id, request);
    }

    @GetMapping("/shares/{id}/preview")
    public Object preview(@PathVariable UUID id) {
        return shares.preview(CurrentUser.require().getId(), id);
    }

    @GetMapping("/shares/{id}/media/{mediaId}/content")
    public ResponseEntity<Resource> media(@PathVariable UUID id, @PathVariable UUID mediaId) {
        MediaService.StoredFile file = shares.snapshotMedia(CurrentUser.require().getId(), id, mediaId);
        return file.toResponse();
    }

    @PostMapping("/shares/{id}/accept")
    public Object accept(@PathVariable UUID id) {
        return shares.accept(CurrentUser.require().getId(), id);
    }

    @PostMapping("/shares/{id}/decline")
    public Object decline(@PathVariable UUID id) {
        return shares.decline(CurrentUser.require().getId(), id);
    }
}