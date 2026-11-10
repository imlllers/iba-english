package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Size;

public record MaterialBlockWriteRequest(
        @Size(max = 200) String title,
        @Size(max = 4000) String instructions,
        JsonNode content,
        JsonNode items,
        String mediaId,
        String mediaKind
) {
}
