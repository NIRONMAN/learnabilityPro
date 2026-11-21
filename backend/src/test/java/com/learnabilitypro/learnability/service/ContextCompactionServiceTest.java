package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.MessageSender;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.springframework.ai.chat.client.ChatClient;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ContextCompactionServiceTest {

    @Test
    void needsCompactionReturnsTrueOnlyWhenAboveThreshold() {
        ContextCompactionService service = new ContextCompactionService(null, 6, 4);

        List<ChatMessage> fewMessages = List.of(
                ChatMessage.builder().sender(MessageSender.USER).content("Hi").build(),
                ChatMessage.builder().sender(MessageSender.ASSISTANT).content("Hello").build()
        );
        assertThat(service.needsCompaction(fewMessages)).isFalse();

        List<ChatMessage> manyMessages = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            manyMessages.add(ChatMessage.builder().sender(MessageSender.USER).content("Question " + i).build());
        }
        assertThat(service.needsCompaction(manyMessages)).isTrue();
    }

    @Test
    void compactConversationIfNeededInvokesChatClientAndCachesResult() {
        ChatClient chatClient = mock(ChatClient.class, Answers.RETURNS_DEEP_STUBS);
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("- Concept A explained\n- Student asked about Equation 2");

        ContextCompactionService service = new ContextCompactionService(chatClient, 4, 2);
        UUID sessionId = UUID.randomUUID();

        List<ChatMessage> messages = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            messages.add(ChatMessage.builder()
                    .sender(i % 2 == 1 ? MessageSender.USER : MessageSender.ASSISTANT)
                    .content("Message " + i)
                    .build());
        }

        String summary = service.compactConversationIfNeeded(sessionId, messages);

        assertThat(summary).isEqualTo("- Concept A explained\n- Student asked about Equation 2");
        assertThat(service.getCompactedSummary(sessionId)).isEqualTo(summary);

        // Subsequent call with same count should return cached summary without calling LLM again
        String cached = service.compactConversationIfNeeded(sessionId, messages);
        assertThat(cached).isEqualTo(summary);
    }

    @Test
    void fallbackExtractsStudentQuestionsWhenChatClientFails() {
        ContextCompactionService service = new ContextCompactionService(null, 3, 1);
        UUID sessionId = UUID.randomUUID();

        List<ChatMessage> messages = List.of(
                ChatMessage.builder().sender(MessageSender.USER).content("What is entropy?").build(),
                ChatMessage.builder().sender(MessageSender.ASSISTANT).content("Entropy is disorder.").build(),
                ChatMessage.builder().sender(MessageSender.USER).content("How does it relate to heat?").build(),
                ChatMessage.builder().sender(MessageSender.ASSISTANT).content("Heat transfer changes entropy.").build()
        );

        String summary = service.compactConversationIfNeeded(sessionId, messages);

        assertThat(summary).isNotNull();
        assertThat(summary).contains("What is entropy?");
    }
}
