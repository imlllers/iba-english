package com.iba.testing.share.dto;

import java.util.List;
import java.util.UUID;

public record ShareTestRequest(List<UUID> recipientIds, String comment) {
}