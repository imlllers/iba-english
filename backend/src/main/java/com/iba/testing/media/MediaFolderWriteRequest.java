package com.iba.testing.media;

import jakarta.validation.constraints.Size;

public record MediaFolderWriteRequest(
        @Size(max = 120) String name,
        String parentId
) {
}
