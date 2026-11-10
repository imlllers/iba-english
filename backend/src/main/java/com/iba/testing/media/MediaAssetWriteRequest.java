package com.iba.testing.media;

import jakarta.validation.constraints.Size;

public record MediaAssetWriteRequest(
        String folderId,
        @Size(max = 200) String filename
) {
}
