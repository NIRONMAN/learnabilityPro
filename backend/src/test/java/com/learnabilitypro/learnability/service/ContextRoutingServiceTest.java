package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ContextRoutingServiceTest {

    @Test
    void resolveModelContextWindowReturnsCorrectLimitsForKnownFamilies() {
        ContextRoutingService service = new ContextRoutingService("gemini-flash-lite-latest", 0.15, 25000);

        assertThat(service.resolveModelContextWindow("gemini-1.5-pro")).isEqualTo(2_000_000);
        assertThat(service.resolveModelContextWindow("gemini-flash-lite-latest")).isEqualTo(1_000_000);
        assertThat(service.resolveModelContextWindow("gemini-2.0-flash")).isEqualTo(1_000_000);
        assertThat(service.resolveModelContextWindow("claude-3-5-sonnet")).isEqualTo(200_000);
        assertThat(service.resolveModelContextWindow("gpt-4o")).isEqualTo(128_000);
        assertThat(service.resolveModelContextWindow("llama-3-8b")).isEqualTo(8_192);
        assertThat(service.resolveModelContextWindow("unknown-custom-model")).isEqualTo(32_000);
    }

    @Test
    void getSmartZoneTokenLimitAppliesPercentageAndCeiling() {
        // 15% of 1,000,000 is 150,000. Capped at 25,000.
        ContextRoutingService geminiService = new ContextRoutingService("gemini-flash-lite-latest", 0.15, 25000);
        assertThat(geminiService.getSmartZoneTokenLimit()).isEqualTo(25000);

        // 15% of 128,000 is 19,200. Under 25,000 ceiling -> 19,200.
        ContextRoutingService gpt4oService = new ContextRoutingService("gpt-4o", 0.15, 25000);
        assertThat(gpt4oService.getSmartZoneTokenLimit()).isEqualTo(19200);

        // 15% of 8,192 is 1,229.
        ContextRoutingService llamaService = new ContextRoutingService("llama-3", 0.15, 25000);
        assertThat(llamaService.getSmartZoneTokenLimit()).isEqualTo(1229);
    }

    @Test
    void estimateTokensCalculatesRoughlyFourCharsPerToken() {
        ContextRoutingService service = new ContextRoutingService("gemini-flash-lite-latest", 0.15, 25000);

        assertThat(service.estimateTokens(null)).isEqualTo(0);
        assertThat(service.estimateTokens("")).isEqualTo(0);
        assertThat(service.estimateTokens("Hello World")).isEqualTo(3);
        assertThat(service.estimateTokens("a".repeat(400))).isEqualTo(100);
    }

    @Test
    void determineStrategyRoutesBasedOnSmartZoneThreshold() {
        // With a 1,000 token limit for test clarity
        ContextRoutingService service = new ContextRoutingService("llama-3", 0.10, 500);
        // Llama-3 8192 * 10% = 819. Capped at 500 tokens (~2000 chars)

        String shortText = "a".repeat(1200); // ~300 tokens -> IN_CONTEXT
        String longText = "a".repeat(3000);  // ~750 tokens -> VECTOR_RAG

        assertThat(service.determineStrategy(shortText)).isEqualTo(ContextRoutingService.RoutingStrategy.IN_CONTEXT);
        assertThat(service.determineStrategy(longText)).isEqualTo(ContextRoutingService.RoutingStrategy.VECTOR_RAG);
        assertThat(service.exceedsSmartZone(shortText)).isFalse();
        assertThat(service.exceedsSmartZone(longText)).isTrue();
    }

    @Test
    void shouldUseRagEvaluatesCorrectlyForSessions() {
        ContextRoutingService service = new ContextRoutingService("gemini-flash-lite-latest", 0.15, 25000);
        UUID sessionId = UUID.randomUUID();

        // 1. Null session or null contextType
        assertThat(service.shouldUseRag(null, false)).isFalse();
        StudySession nullContextSession = StudySession.builder().id(sessionId).build();
        assertThat(service.shouldUseRag(nullContextSession, false)).isFalse();

        // 2. Session with existing vectors is always RAG eligible
        StudySession topicSession = StudySession.builder()
                .id(sessionId)
                .contextType(ContextType.TOPIC)
                .build();
        assertThat(service.shouldUseRag(topicSession, true)).isTrue();
        assertThat(service.shouldUseRag(topicSession, false)).isFalse();

        // 3. PDF session without explicit context text defaults to RAG
        StudySession pdfEmptySession = StudySession.builder()
                .id(sessionId)
                .contextType(ContextType.PDF)
                .contextText(null)
                .build();
        assertThat(service.shouldUseRag(pdfEmptySession, false)).isTrue();

        // 4. PDF session with text exceeding smart zone
        String hugeText = "a".repeat(120_000); // 30,000 tokens > 25,000 cap
        StudySession hugePdfSession = StudySession.builder()
                .id(sessionId)
                .contextType(ContextType.PDF)
                .contextText(hugeText)
                .build();
        assertThat(service.shouldUseRag(hugePdfSession, false)).isTrue();
    }
}
