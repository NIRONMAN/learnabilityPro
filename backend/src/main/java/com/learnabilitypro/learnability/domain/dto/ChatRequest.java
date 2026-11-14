package com.learnabilitypro.learnability.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String message,
        Integer videoTimestampSec,
        String playbackContext
) {
    public ChatRequest(String message) {
        this(message, null, null);
    }
}
