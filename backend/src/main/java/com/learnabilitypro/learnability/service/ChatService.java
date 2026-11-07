package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.ChatMessageDto;
import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.MessageSender;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.ChatMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final String CHAT_MEMORY_CONVERSATION_ID = "chat_memory_conversation_id";

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final RagService ragService;
    private final StudySessionService sessionService;
    private final ChatMessageRepository messageRepository;

    public ChatService(
            ChatClient chatClient,
            ChatMemory chatMemory,
            RagService ragService,
            StudySessionService sessionService,
            ChatMessageRepository messageRepository) {
        this.chatClient = chatClient;
        this.chatMemory = chatMemory;
        this.ragService = ragService;
        this.sessionService = sessionService;
        this.messageRepository = messageRepository;
    }

    @Transactional
    public ChatMessageDto sendMessage(UUID sessionId, UUID userId, String userMessage) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        ChatMessage userMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .content(userMessage)
                .build();
        messageRepository.save(userMsg);

        String systemPrompt = buildSystemPrompt(session);
        MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory).build();

        String assistantResponse;
        try {
            QuestionAnswerAdvisor ragAdvisor = ragService.createSessionAdvisor(sessionId);
            assistantResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .advisors(a -> a
                            .param(CHAT_MEMORY_CONVERSATION_ID, sessionId.toString())
                            .advisors(memoryAdvisor, ragAdvisor))
                    .call()
                    .content();
        } catch (Exception ex) {
            log.warn("RAG Advisor fallback to standard memory for session {}: {}", sessionId, ex.getMessage());
            assistantResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .advisors(a -> a
                            .param(CHAT_MEMORY_CONVERSATION_ID, sessionId.toString())
                            .advisors(memoryAdvisor))
                    .call()
                    .content();
        }

        if (assistantResponse == null || assistantResponse.isBlank()) {
            assistantResponse = "I have processed your question based on the study session material.";
        }

        ChatMessage assistantMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.ASSISTANT)
                .content(assistantResponse)
                .build();
        assistantMsg = messageRepository.save(assistantMsg);

        return ChatMessageDto.fromEntity(assistantMsg);
    }

    public Flux<String> streamMessage(UUID sessionId, UUID userId, String userMessage) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        ChatMessage userMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .content(userMessage)
                .build();
        messageRepository.save(userMsg);

        String systemPrompt = buildSystemPrompt(session);
        MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory).build();

        StringBuilder fullResponse = new StringBuilder();

        Flux<String> streamFlux;
        try {
            QuestionAnswerAdvisor ragAdvisor = ragService.createSessionAdvisor(sessionId);
            streamFlux = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .advisors(a -> a
                            .param(CHAT_MEMORY_CONVERSATION_ID, sessionId.toString())
                            .advisors(memoryAdvisor, ragAdvisor))
                    .stream()
                    .content();
        } catch (Exception ex) {
            log.warn("RAG stream fallback to standard memory: {}", ex.getMessage());
            streamFlux = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .advisors(a -> a
                            .param(CHAT_MEMORY_CONVERSATION_ID, sessionId.toString())
                            .advisors(memoryAdvisor))
                    .stream()
                    .content();
        }

        return streamFlux
                .doOnNext(fullResponse::append)
                .doOnComplete(() -> {
                    String finalContent = fullResponse.toString();
                    if (!finalContent.isBlank()) {
                        ChatMessage assistantMsg = ChatMessage.builder()
                                .session(session)
                                .sender(MessageSender.ASSISTANT)
                                .content(finalContent)
                                .build();
                        messageRepository.save(assistantMsg);
                    }
                });
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getSessionMessages(UUID sessionId, UUID userId) {
        sessionService.getSessionEntity(sessionId, userId);
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ChatMessageDto::fromEntity)
                .toList();
    }

    private String buildSystemPrompt(StudySession session) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an intelligent, pedagogically grounded AI tutor for Learnability Pro.\n");
        sb.append("Your goal is to guide the student toward deep mastery, active recall, and conceptual clarity.\n");
        sb.append("Topic: ").append(session.getTitle()).append("\n");
        sb.append("Session Type: ").append(session.getSessionType()).append("\n");
        if (session.getContextText() != null && !session.getContextText().isBlank()) {
            sb.append("\nReference Study Material:\n");
            sb.append(session.getContextText()).append("\n");
        }
        sb.append("\nAlways be concise, precise, encouraging, and break complex topics down step by step.");
        return sb.toString();
    }
}
