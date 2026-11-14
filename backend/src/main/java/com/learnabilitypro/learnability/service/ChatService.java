package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.ChatMessageDto;
import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.ContextType;
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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final String CHAT_MEMORY_CONVERSATION_ID = "chat_memory_conversation_id";
    private static final Pattern TS_PATTERN = Pattern.compile("\\[(\\d{1,2}):(\\d{2})\\]");

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
        return sendMessage(sessionId, userId, userMessage, null, null);
    }

    @Transactional
    public ChatMessageDto sendMessage(
            UUID sessionId,
            UUID userId,
            String userMessage,
            Integer videoTimestampSec,
            String playbackContext) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        ChatMessage userMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .content(userMessage)
                .build();
        messageRepository.save(userMsg);

        String systemPrompt = buildSystemPrompt(session, videoTimestampSec, playbackContext);
        MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory).build();

        String assistantResponse;
        if (shouldUseRagAdvisor(session)) {
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
        } else {
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
        return streamMessage(sessionId, userId, userMessage, null, null);
    }

    public Flux<String> streamMessage(
            UUID sessionId,
            UUID userId,
            String userMessage,
            Integer videoTimestampSec,
            String playbackContext) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        ChatMessage userMsg = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .content(userMessage)
                .build();
        messageRepository.save(userMsg);

        String systemPrompt = buildSystemPrompt(session, videoTimestampSec, playbackContext);
        MessageChatMemoryAdvisor memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory).build();

        StringBuilder fullResponse = new StringBuilder();

        Flux<String> streamFlux;
        if (shouldUseRagAdvisor(session)) {
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
        } else {
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

    public boolean shouldUseRagAdvisor(StudySession session) {
        if (session == null || session.getContextType() == null) {
            return false;
        }
        if (session.getContextType() == ContextType.PDF) {
            return true;
        }
        return ragService != null && session.getId() != null && ragService.hasVectors(session.getId());
    }

    public String buildSystemPrompt(StudySession session) {
        return buildSystemPrompt(session, null, null);
    }

    public String buildSystemPrompt(StudySession session, Integer videoTimestampSec, String playbackContext) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an intelligent, pedagogically grounded AI tutor for Learnability Pro.\n");
        sb.append("Your goal is to guide the student toward deep mastery, active recall, and conceptual clarity.\n");
        sb.append("Topic: ").append(session.getTitle()).append("\n");
        sb.append("Session Type: ").append(session.getSessionType()).append("\n");

        if (session.getContextText() != null && !session.getContextText().isBlank()) {
            sb.append("\nThe user has provided reference study material below. Treat this material strictly as your primary source of truth when answering questions, citing definitions and concepts directly from it.\n");
            sb.append("When explaining concepts or quoting from the video/material, include grounded citations to specific sections, equations, or timestamps when available (e.g., `[§ 3.2]`, `[Page 2]`, `[04:15]`) so the student can trace every statement back to the source material.\n");
            sb.append("\nReference Study Material:\n");
            sb.append(session.getContextText()).append("\n");
        } else {
            sb.append("\nNo specific reference source or syllabus has been attached for this session. Act as an expert, generalized Socratic academic tutor. Draw upon your broad general knowledge to teach, explain, test understanding, and answer any questions thoroughly and insightfully without saying you lack context.\n");
        }

        // Real-time video playback context awareness
        if (videoTimestampSec != null && videoTimestampSec >= 0) {
            int min = videoTimestampSec / 60;
            int sec = videoTimestampSec % 60;
            String ts = String.format("[%02d:%02d]", min, sec);
            sb.append("\n=== CURRENT REAL-TIME VIDEO PLAYBACK CONTEXT ===\n");
            sb.append("The student is currently watching the YouTube lecture and is paused at timestamp ")
              .append(ts).append(" (").append(videoTimestampSec).append(" seconds into the video).\n");

            String contextualExcerpt = playbackContext;
            if ((contextualExcerpt == null || contextualExcerpt.isBlank()) && session.getContextText() != null) {
                contextualExcerpt = extractTranscriptWindow(session.getContextText(), videoTimestampSec, 20);
            }
            if (contextualExcerpt != null && !contextualExcerpt.isBlank()) {
                sb.append("Dialogue spoken in the lecture at or immediately preceding this exact timestamp:\n");
                sb.append("\"\"\"\n").append(contextualExcerpt).append("\n\"\"\"\n");
            }
            sb.append("CRITICAL INSTRUCTION: If the student asks 'what did he just say?', 'what was the thing he just said at that instant?', 'explain what is happening right now', or asks any question referring to the current moment:\n");
            sb.append("- Address the dialogue spoken right at or just before ").append(ts).append(".\n");
            sb.append("- Explain what the speaker meant in clear conceptual terms with grounded timestamp citations like `").append(ts).append("`.\n");
            sb.append("================================================\n");
        }

        sb.append("\nAlways be concise, precise, encouraging, and break complex topics down step by step.");
        return sb.toString();
    }

    public static String extractTranscriptWindow(String contextText, int targetSec, int windowSec) {
        if (contextText == null || contextText.isBlank()) return null;
        String[] lines = contextText.split("\\r?\\n");
        record TsSegment(int seconds, String line) {}
        List<TsSegment> segments = new ArrayList<>();

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            Matcher m = TS_PATTERN.matcher(line);
            if (m.find()) {
                int min = Integer.parseInt(m.group(1));
                int sec = Integer.parseInt(m.group(2));
                int totalSec = min * 60 + sec;
                segments.add(new TsSegment(totalSec, line));
            }
        }

        if (segments.isEmpty()) return null;

        List<String> windowLines = new ArrayList<>();
        int lowerBound = Math.max(0, targetSec - windowSec);
        int upperBound = targetSec + 5;

        for (TsSegment seg : segments) {
            if (seg.seconds >= lowerBound && seg.seconds <= upperBound) {
                windowLines.add(seg.line);
            }
        }

        if (windowLines.isEmpty()) {
            TsSegment closestBefore = null;
            for (TsSegment seg : segments) {
                if (seg.seconds <= targetSec) {
                    closestBefore = seg;
                } else {
                    break;
                }
            }
            if (closestBefore != null) {
                windowLines.add(closestBefore.line);
            } else {
                windowLines.add(segments.get(0).line);
            }
        }

        return String.join("\n", windowLines);
    }
}
