package com.iba.testing.media;

import com.iba.testing.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
public class TeacherMediaController {

    private final MediaService media;

    public TeacherMediaController(MediaService media) {
        this.media = media;
    }

    @GetMapping("/media")
    public Object list(@RequestParam(required = false) String folderId,
                       @RequestParam(defaultValue = "") String q,
                       @RequestParam(defaultValue = "") String kind,
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "24") int size) {
        return media.browse(CurrentUser.require().getId(), folderId, q, kind, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/media")
    public Object upload(@RequestParam("file") MultipartFile file,
                         @RequestParam(required = false) String folderId,
                         @RequestParam(defaultValue = "true") boolean library) {
        return media.storeForTeacher(CurrentUser.require().getId(), file, folderId, library);
    }

    @PatchMapping("/media/{id}")
    public Object updateAsset(@PathVariable UUID id, @Valid @RequestBody MediaAssetWriteRequest request) {
        return media.updateAsset(CurrentUser.require().getId(), id, request);
    }

    @DeleteMapping("/media/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAsset(@PathVariable UUID id) {
        media.deleteAsset(CurrentUser.require().getId(), id);
    }

    @GetMapping("/media/folders")
    public Object folders() {
        return media.allFolders(CurrentUser.require().getId());
    }

    @PostMapping("/media/folders")
    public Object createFolder(@Valid @RequestBody MediaFolderWriteRequest request) {
        return media.createFolder(CurrentUser.require().getId(), request);
    }

    @PatchMapping("/media/folders/{id}")
    public Object updateFolder(@PathVariable UUID id, @Valid @RequestBody MediaFolderWriteRequest request) {
        return media.updateFolder(CurrentUser.require().getId(), id, request);
    }

    @DeleteMapping("/media/folders/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFolder(@PathVariable UUID id) {
        media.deleteFolder(CurrentUser.require().getId(), id);
    }

    @GetMapping("/media/{id}/content")
    public ResponseEntity<Resource> content(@PathVariable UUID id) {
        return media.teacherFile(CurrentUser.require().getId(), id).toResponse();
    }

    @GetMapping("/attempts/{attemptId}/media/{mediaId}")
    public ResponseEntity<Resource> attemptContent(@PathVariable UUID attemptId, @PathVariable UUID mediaId) {
        return media.teacherAttemptFile(CurrentUser.require().getId(), attemptId, mediaId).toResponse();
    }
}
