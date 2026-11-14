package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;
import java.util.UUID;

public record FlashcardDeckDto(
        @JsonPropertyDescription("Unique deck ID if saved")
        UUID id,

        @JsonPropertyDescription("The primary subject or topic for this flashcard deck")
        String topic,

        @JsonPropertyDescription("List of flashcards covering key concepts and active recall questions")
        List<FlashcardDto> cards
) {
    public FlashcardDeckDto(String topic, List<FlashcardDto> cards) {
        this(null, topic, cards);
    }
}
