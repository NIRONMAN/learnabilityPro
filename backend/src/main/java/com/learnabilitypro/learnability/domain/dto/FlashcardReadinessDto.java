package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

public record FlashcardReadinessDto(
        @JsonPropertyDescription("Whether the study session contains sufficient substantive learning context to generate flashcards")
        boolean hasSufficientContext,

        @JsonPropertyDescription("The subject or topic identified for the study session")
        String topic,

        @JsonPropertyDescription("Clear rationale explaining whether enough context exists or what is missing")
        String reason,

        @JsonPropertyDescription("Key concepts identified from the study conversation and literature")
        List<String> keyConcepts,

        @JsonPropertyDescription("Number of chat messages exchanged in this session")
        int messageCount,

        @JsonPropertyDescription("Whether uploaded literature or document context is attached")
        boolean hasDocumentContext
) {}
