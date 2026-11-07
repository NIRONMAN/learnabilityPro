package com.learnabilitypro.learnability.domain.dto;

import java.util.UUID;

public record IngestResponse(
        UUID sessionId,
        String title,
        int chunkCount,
        String summary
) {}
