package com.learnabilitypro.learnability.domain.dto;

import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSessionRequest(
        String title,
        @NotNull SessionType sessionType,
        @NotNull ContextType contextType,
        String sourceUrl,
        String contextText
) {}
