package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

public record FlashcardDeckDto(
        @JsonPropertyDescription("The primary subject or topic for this flashcard deck")
        String topic,

        @JsonPropertyDescription("List of flashcards covering key concepts and active recall questions")
        List<FlashcardDto> cards
) {}
