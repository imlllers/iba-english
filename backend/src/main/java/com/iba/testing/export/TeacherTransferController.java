package com.iba.testing.export;

import com.iba.testing.security.CurrentUser;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher/tests")
public class TeacherTransferController {

    private final TestTransferService transfer;

    public TeacherTransferController(TestTransferService transfer) {
        this.transfer = transfer;
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) {
        byte[] zip = transfer.exportZip(CurrentUser.require().getId(), id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test-" + id + ".zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zip);
    }
}
