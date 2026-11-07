package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

public record FlashcardDto(
        @JsonPropertyDescription("The prompt, question, or key concept")
        String question,

        @JsonPropertyDescription("The concise and accurate answer or explanation")
        String answer,

        @JsonPropertyDescription("A helpful memory hint or clue")
        String hint
) {}
