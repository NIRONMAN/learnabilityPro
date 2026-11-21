package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.MessageSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ContextCompactionService {

    private static final Logger log = LoggerFactory.getLogger(ContextCompactionService.class);

    private final ChatClient chatClient;
    private final int messageThreshold;
    private final int recentMessagesRetained;

    // Cache to hold compacted conversation summaries per session
    private final Map<UUID, String> compactedSummaries = new ConcurrentHashMap<>();
    private final Map<UUID, Integer> lastCompactedMessageCount = new ConcurrentHashMap<>();

    public ContextCompactionService(
            ChatClient chatClient,
            @Value("${application.context.compaction-message-threshold:6}") int messageThreshold,
            @Value("${application.context.recent-messages-retained:4}") int recentMessagesRetained) {
        this.chatClient = chatClient;
        this.messageThreshold = Math.max(2, messageThreshold);
        this.recentMessagesRetained = Math.max(1, recentMessagesRetained);
    }

    /**
     * Determines whether the conversation message history has grown beyond the compaction threshold.
     */
    public boolean needsCompaction(List<ChatMessage> messages) {
        return messages != null && messages.size() > messageThreshold;
    }

    /**
     * Retrieves the current cached conversation summary for the given session.
     */
    public String getCompactedSummary(UUID sessionId) {
        if (sessionId == null) {
            return null;
        }
        return compactedSummaries.get(sessionId);
    }

    /**
     * Auto-compacts conversation history when it crosses the message threshold.
     * Keeps recent messages intact for immediate conversational continuity while
     * condensing older turns into a high-density learning summary.
     */
    public String compactConversationIfNeeded(UUID sessionId, List<ChatMessage> messages) {
        if (sessionId == null || messages == null || messages.size() <= messageThreshold) {
            return sessionId != null ? compactedSummaries.get(sessionId) : null;
        }

        int currentCount = messages.size();
        Integer lastCount = lastCompactedMessageCount.get(sessionId);

        // Avoid re-summarizing if fewer than 2 new messages have arrived since last compaction
        if (lastCount != null && (currentCount - lastCount) < 2) {
            return compactedSummaries.get(sessionId);
        }

        int splitIndex = Math.max(0, messages.size() - recentMessagesRetained);
        List<ChatMessage> olderMessages = messages.subList(0, splitIndex);

        if (olderMessages.isEmpty()) {
            return compactedSummaries.get(sessionId);
        }

        StringBuilder conversationToSummarize = new StringBuilder();
        String existingSummary = compactedSummaries.get(sessionId);
        if (existingSummary != null && !existingSummary.isBlank()) {
            conversationToSummarize.append("Earlier Summary:\n").append(existingSummary).append("\n\n");
        }

        conversationToSummarize.append("Recent Chat History to Compact:\n");
        for (ChatMessage msg : olderMessages) {
            conversationToSummarize.append(msg.getSender())
                    .append(": ")
                    .append(msg.getContent())
                    .append("\n");
        }

        try {
            if (chatClient != null) {
                String summary = chatClient.prompt()
                        .system("You are an expert conversation summarizer for an AI learning tutor.\n"
                                + "Condense the prior conversation into 3-5 concise bullet points capturing:\n"
                                + "- Core concepts, definitions, and topics explored\n"
                                + "- Specific student questions, doubts, or misconceptions\n"
                                + "- Key milestones or conclusions reached\n"
                                + "Omit pleasantries, introductions, and filler.")
                        .user(conversationToSummarize.toString())
                        .call()
                        .content();

                if (summary != null && !summary.isBlank()) {
                    compactedSummaries.put(sessionId, summary.trim());
                    lastCompactedMessageCount.put(sessionId, currentCount);
                    log.info("Auto-compacted {} earlier messages for session {}", olderMessages.size(), sessionId);
                    return summary.trim();
                }
            }
        } catch (Exception e) {
            log.warn("LLM conversation compaction fallback for session {}: {}", sessionId, e.getMessage());
        }

        // Deterministic fallback: extract concise bullets of student queries
        String fallback = olderMessages.stream()
                .filter(m -> m.getSender() == MessageSender.USER)
                .map(m -> "- Prior student question: " + (m.getContent().length() > 90 ? m.getContent().substring(0, 87) + "..." : m.getContent()))
                .collect(Collectors.joining("\n"));

        compactedSummaries.put(sessionId, fallback);
        lastCompactedMessageCount.put(sessionId, currentCount);
        return fallback;
    }

    /**
     * Clear cached compaction for a session (e.g. when session is reset or deleted).
     */
    public void clearSession(UUID sessionId) {
        if (sessionId != null) {
            compactedSummaries.remove(sessionId);
            lastCompactedMessageCount.remove(sessionId);
        }
    }

    public int getMessageThreshold() {
        return messageThreshold;
    }

    public int getRecentMessagesRetained() {
        return recentMessagesRetained;
    }
}
