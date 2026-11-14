package com.learnabilitypro.learnability.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnabilitypro.learnability.domain.dto.FlashcardDeckDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardReadinessDto;
import com.learnabilitypro.learnability.domain.entity.*;
import com.learnabilitypro.learnability.domain.repository.ChatMessageRepository;
import com.learnabilitypro.learnability.domain.repository.FlashcardDeckRepository;
import com.learnabilitypro.learnability.domain.repository.FlashcardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlashcardServiceTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ChatClient chatClient;

    @Mock
    private StudySessionService sessionService;

    @Mock
    private FlashcardDeckRepository deckRepository;

    @Mock
    private FlashcardRepository cardRepository;

    @Mock
    private ChatMessageRepository messageRepository;

    private ObjectMapper objectMapper;
    private FlashcardService flashcardService;

    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        flashcardService = new FlashcardService(
                chatClient,
                sessionService,
                deckRepository,
                cardRepository,
                messageRepository,
                objectMapper
        );
        sessionId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void checkReadinessReturnsFalseWhenNoContextAndNoMessages() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("What is dinosaurs.?")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText(null)
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(Collections.emptyList());

        FlashcardReadinessDto readiness = flashcardService.checkReadiness(sessionId, userId);

        assertThat(readiness.hasSufficientContext()).isFalse();
        assertThat(readiness.topic()).isEqualTo("What is dinosaurs.?");
        assertThat(readiness.reason()).contains("does not have any conversation history");
        assertThat(readiness.messageCount()).isEqualTo(0);
    }

    @Test
    void checkReadinessReturnsFalseWhenMinimalChatOnly() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Dinosaurs")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText("")
                .build();

        ChatMessage singleMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .content("What is dinosaurs.?")
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(List.of(singleMsg));

        FlashcardReadinessDto readiness = flashcardService.checkReadiness(sessionId, userId);

        assertThat(readiness.hasSufficientContext()).isFalse();
        assertThat(readiness.reason()).contains("brief interaction");
        assertThat(readiness.messageCount()).isEqualTo(1);
    }

    @Test
    void checkReadinessReturnsTrueWhenSubstantiveDiscussionEvaluated() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Dinosaur Paleobiology")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText("Dinosaurs evolved in the Triassic period following the Permian extinction.")
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(List.of(
                ChatMessage.builder().session(session).sender(MessageSender.USER).content("How are Saurischia and Ornithischia classified?").build(),
                ChatMessage.builder().session(session).sender(MessageSender.ASSISTANT).content("They are differentiated based on pelvic structure: lizard-hipped vs bird-hipped hip arrangements.").build()
        ));

        when(chatClient.prompt().system(anyString()).user(anyString()).call().content()).thenReturn("""
                {
                  "hasSufficientContext": true,
                  "topic": "Dinosaur Paleobiology",
                  "reason": "Clear discussion covering pelvic classification and evolutionary origins.",
                  "keyConcepts": ["Pelvic anatomy", "Saurischia vs Ornithischia", "Triassic radiation"]
                }
                """);

        FlashcardReadinessDto readiness = flashcardService.checkReadiness(sessionId, userId);

        assertThat(readiness.hasSufficientContext()).isTrue();
        assertThat(readiness.topic()).isEqualTo("Dinosaur Paleobiology");
        assertThat(readiness.keyConcepts()).contains("Pelvic anatomy", "Saurischia vs Ornithischia");
    }

    @Test
    void generateSmartFallbackDeckNeverProducesJokePlaceholder() {
        FlashcardDeckDto fallback = flashcardService.generateSmartFallbackDeck("dinosaurs.?");

        assertThat(fallback.topic()).isEqualTo("dinosaurs.?");
        assertThat(fallback.cards()).isNotEmpty();
        assertThat(fallback.cards().size()).isLessThanOrEqualTo(10);

        for (var card : fallback.cards()) {
            assertThat(card.question()).doesNotContain("A core subject of study in this session.");
            assertThat(card.answer()).doesNotContain("A core subject of study in this session.");
            assertThat(card.answer()).isNotBlank();
            assertThat(card.hint()).isNotBlank();
        }
    }

    @Test
    void generateFlashcardsSavesDeckAndCapsAt10() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Dinosaurs")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(Collections.emptyList());

        // LLM returns 12 cards -> should be capped at 10
        StringBuilder cardsJson = new StringBuilder();
        for (int i = 1; i <= 12; i++) {
            if (i > 1) cardsJson.append(",");
            cardsJson.append(String.format("{\"question\":\"Q%d\",\"answer\":\"A%d\",\"hint\":\"H%d\"}", i, i, i));
        }

        when(chatClient.prompt().system(anyString()).user(anyString()).call().content()).thenReturn(
                "{\"topic\":\"Dinosaurs\",\"cards\":[" + cardsJson + "]}"
        );

        when(deckRepository.save(any(FlashcardDeck.class))).thenAnswer(invocation -> {
            FlashcardDeck deck = invocation.getArgument(0);
            deck.setId(UUID.randomUUID());
            for (Flashcard f : deck.getFlashcards()) {
                f.setId(UUID.randomUUID());
            }
            return deck;
        });

        FlashcardDeckDto result = flashcardService.generateFlashcards(sessionId, userId, "Dinosaurs", true, null);

        assertThat(result.topic()).isEqualTo("Dinosaurs");
        assertThat(result.cards().size()).isEqualTo(10); // Capped at 10
        verify(deckRepository).save(any(FlashcardDeck.class));
    }
}
