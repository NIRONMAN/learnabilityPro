package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.UUID;

public record FlashcardDto(
        @JsonPropertyDescription("Unique card ID if saved")
        UUID id,

        @JsonPropertyDescription("The prompt, question, or key concept")
        String question,

        @JsonPropertyDescription("The concise and accurate answer or explanation")
        String answer,

        @JsonPropertyDescription("A helpful memory hint or clue")
        String hint
) {
    public FlashcardDto(String question, String answer, String hint) {
        this(null, question, answer, hint);
    }
}
