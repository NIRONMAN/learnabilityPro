package com.learnabilitypro.learnability.domain.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record YouTubeIngestRequest(
        @NotBlank String url,
        String title,
        UUID sessionId
) {}
