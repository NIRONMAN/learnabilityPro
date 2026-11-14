package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.ChatMessageDto;
import com.learnabilitypro.learnability.domain.entity.*;
import com.learnabilitypro.learnability.domain.repository.ChatMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ChatClient chatClient;

    @Mock
    private ChatMemory chatMemory;

    @Mock
    private RagService ragService;

    @Mock
    private StudySessionService sessionService;

    @Mock
    private ChatMessageRepository messageRepository;

    private ChatService chatService;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(chatClient, chatMemory, ragService, sessionService, messageRepository);
        sessionId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void buildSystemPromptWithContextTextInstructsModelToTreatAsTruth() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Quantum Electrodynamics")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.PDF)
                .contextText("Photons mediate the electromagnetic interaction.")
                .build();

        String prompt = chatService.buildSystemPrompt(session);

        assertThat(prompt).contains("The user has provided reference study material below. Treat this material strictly as your primary source of truth when answering questions, citing definitions and concepts directly from it.");
        assertThat(prompt).contains("Reference Study Material:");
        assertThat(prompt).contains("Photons mediate the electromagnetic interaction.");
    }

    @Test
    void buildSystemPromptWithoutContextTextInstructsModelAsExpertTutor() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("General Philosophy")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText(null)
                .build();

        String prompt = chatService.buildSystemPrompt(session);

        assertThat(prompt).contains("No specific reference source or syllabus has been attached for this session. Act as an expert, generalized Socratic academic tutor. Draw upon your broad general knowledge to teach, explain, test understanding, and answer any questions thoroughly and insightfully without saying you lack context.");
        assertThat(prompt).doesNotContain("Reference Study Material:");
    }

    @Test
    void shouldUseRagAdvisorReturnsTrueOnlyForPdfOrIndexedVectors() {
        StudySession pdfSession = StudySession.builder()
                .id(sessionId)
                .contextType(ContextType.PDF)
                .build();
        StudySession topicSession = StudySession.builder()
                .id(sessionId)
                .contextType(ContextType.TOPIC)
                .build();

        when(ragService.hasVectors(sessionId)).thenReturn(false);
        assertThat(chatService.shouldUseRagAdvisor(pdfSession)).isTrue();
        assertThat(chatService.shouldUseRagAdvisor(topicSession)).isFalse();

        when(ragService.hasVectors(sessionId)).thenReturn(true);
        assertThat(chatService.shouldUseRagAdvisor(topicSession)).isTrue();
    }

    @Test
    void sendMessageForGeneralizedTopicDoesNotInvokeRagService() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Cognitive Psychology")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText(null)
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(chatClient.prompt().system(anyString()).user(anyString()).advisors(any(java.util.function.Consumer.class)).call().content())
                .thenReturn("Cognitive psychology studies mental processes.");

        ChatMessageDto response = chatService.sendMessage(sessionId, userId, "What is cognition?");

        assertThat(response).isNotNull();
        assertThat(response.content()).isEqualTo("Cognitive psychology studies mental processes.");
        verify(ragService, never()).createSessionAdvisor(any(UUID.class));
    }

    @Test
    void sendMessageForPdfSessionInvokesRagService() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Calculus III")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.PDF)
                .contextText("Partial derivatives and vector fields.")
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(chatClient.prompt().system(anyString()).user(anyString()).advisors(any(java.util.function.Consumer.class)).call().content())
                .thenReturn("Vector fields assign vectors to points in space.");

        ChatMessageDto response = chatService.sendMessage(sessionId, userId, "Define vector fields");

        assertThat(response).isNotNull();
        verify(ragService, times(1)).createSessionAdvisor(sessionId);
    }

    @Test
    void streamMessageForGeneralizedTopicDoesNotInvokeRagService() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Cognitive Psychology")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.TOPIC)
                .contextText(null)
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(chatClient.prompt().system(anyString()).user(anyString()).advisors(any(java.util.function.Consumer.class)).stream().content())
                .thenReturn(reactor.core.publisher.Flux.just("Thinking", " and", " reasoning"));

        reactor.core.publisher.Flux<String> streamFlux = chatService.streamMessage(sessionId, userId, "How do we think?");

        assertThat(streamFlux).isNotNull();
        verify(ragService, never()).createSessionAdvisor(any(UUID.class));
    }

    @Test
    void streamMessageForPdfSessionInvokesRagService() {
        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Calculus III")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.PDF)
                .contextText("Partial derivatives and vector fields.")
                .build();

        when(sessionService.getSessionEntity(sessionId, userId)).thenReturn(session);
        when(chatClient.prompt().system(anyString()).user(anyString()).advisors(any(java.util.function.Consumer.class)).stream().content())
                .thenReturn(reactor.core.publisher.Flux.just("Vectors"));

        reactor.core.publisher.Flux<String> streamFlux = chatService.streamMessage(sessionId, userId, "Stream gradient");

        assertThat(streamFlux).isNotNull();
        verify(ragService, times(1)).createSessionAdvisor(sessionId);
    }
}
