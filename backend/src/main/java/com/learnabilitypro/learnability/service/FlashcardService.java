package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.FlashcardDeckDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardDto;
import com.learnabilitypro.learnability.domain.entity.Flashcard;
import com.learnabilitypro.learnability.domain.entity.FlashcardDeck;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.FlashcardDeckRepository;
import com.learnabilitypro.learnability.domain.repository.FlashcardRepository;
import com.learnabilitypro.learnability.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FlashcardService {

    private static final Logger log = LoggerFactory.getLogger(FlashcardService.class);

    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final FlashcardDeckRepository deckRepository;
    private final FlashcardRepository cardRepository;

    public FlashcardService(
            ChatClient chatClient,
            StudySessionService sessionService,
            FlashcardDeckRepository deckRepository,
            FlashcardRepository cardRepository) {
        this.chatClient = chatClient;
        this.sessionService = sessionService;
        this.deckRepository = deckRepository;
        this.cardRepository = cardRepository;
    }

    @Transactional
    public FlashcardDeckDto generateFlashcards(UUID sessionId, UUID userId, String customTopic) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        String topic = (customTopic != null && !customTopic.isBlank()) ? customTopic : session.getTitle();
        String context = session.getContextText() != null ? session.getContextText() : "";

        BeanOutputConverter<FlashcardDeckDto> converter = new BeanOutputConverter<>(FlashcardDeckDto.class);

        String userPrompt = """
                Generate a comprehensive, high-yield active recall flashcard deck on the topic: %s.
                Use the following context if available:
                %s

                Create between 5 and 12 distinct flashcards covering definitions, key principles, problem-solving concepts, and distinctions.
                Each card must have a precise question, a clear answer, and a helpful mnemonic or hint.
                """.formatted(topic, context);

        FlashcardDeckDto deckDto;
        try {
            deckDto = chatClient.prompt()
                    .system("You are an expert tutor creating active recall flashcards for students. Output only valid JSON matching the requested schema.")
                    .user(u -> u.text(userPrompt + "\n\n" + converter.getFormat()))
                    .call()
                    .entity(converter);
        } catch (Exception ex) {
            log.error("Failed to generate structured flashcards via BeanOutputConverter: {}", ex.getMessage());
            // Fallback graceful deck
            deckDto = new FlashcardDeckDto(
                    topic,
                    List.of(
                            new FlashcardDto("What is " + topic + "?", "A core subject of study in this session.", "Review session notes."),
                            new FlashcardDto("What is the primary objective of studying " + topic + "?", "To achieve conceptual mastery and retention.", "Think about learning outcomes.")
                    )
            );
        }

        // Persist to database
        FlashcardDeck deck = FlashcardDeck.builder()
                .session(session)
                .topic(deckDto.topic() != null ? deckDto.topic() : topic)
                .flashcards(new ArrayList<>())
                .build();

        if (deckDto.cards() != null) {
            for (FlashcardDto cardDto : deckDto.cards()) {
                Flashcard card = Flashcard.builder()
                        .deck(deck)
                        .question(cardDto.question())
                        .answer(cardDto.answer())
                        .hint(cardDto.hint())
                        .masteryLevel(0)
                        .build();
                deck.addFlashcard(card);
            }
        }

        deckRepository.save(deck);

        return deckDto;
    }

    @Transactional(readOnly = true)
    public List<FlashcardDeck> getSessionDecks(UUID sessionId, UUID userId) {
        sessionService.getSessionEntity(sessionId, userId);
        return deckRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
    }

    @Transactional
    public void updateMastery(UUID cardId, int masteryLevel) {
        Flashcard card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard not found: " + cardId));
        card.setMasteryLevel(Math.max(0, Math.min(5, masteryLevel)));
        cardRepository.save(card);
    }
}
