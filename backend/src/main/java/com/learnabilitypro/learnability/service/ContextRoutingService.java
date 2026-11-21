package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContextRoutingService {

    private static final Logger log = LoggerFactory.getLogger(ContextRoutingService.class);

    public enum RoutingStrategy {
        IN_CONTEXT, // Small enough: inject full text directly into prompt, bypass vector store
        VECTOR_RAG  // Exceeds Smart Zone: chunk into vector store, retrieve top-K on demand
    }

    private final String activeModel;
    private final double smartZonePercentage;
    private final int maxTokenCeiling;

    public ContextRoutingService(
            @Value("${spring.ai.google.genai.chat.options.model:${spring.ai.gemini.chat.options.model:gemini-flash-lite-latest}}") String activeModel,
            @Value("${application.context.smart-zone-percentage:0.15}") double smartZonePercentage,
            @Value("${application.context.max-token-ceiling:25000}") int maxTokenCeiling) {
        this.activeModel = activeModel != null ? activeModel : "gemini-flash-lite-latest";
        this.smartZonePercentage = smartZonePercentage > 0 ? smartZonePercentage : 0.15;
        this.maxTokenCeiling = maxTokenCeiling > 0 ? maxTokenCeiling : 25000;

        log.info("Initialized ContextRoutingService for model '{}': Smart Zone = {}%, Hard Ceiling = {} tokens (Effective Limit = {} tokens)",
                this.activeModel,
                (int) (this.smartZonePercentage * 100),
                this.maxTokenCeiling,
                getSmartZoneTokenLimit());
    }

    /**
     * Resolves the theoretical maximum context window for the active model family.
     */
    public int resolveModelContextWindow(String model) {
        if (model == null || model.isBlank()) {
            return 32_000;
        }
        String m = model.toLowerCase();
        if (m.contains("gemini-1.5-pro") || m.contains("gemini-pro")) {
            return 2_000_000;
        }
        if (m.contains("gemini")) {
            // Covers gemini-flash-lite, gemini-1.5-flash, gemini-2.0-flash, etc.
            return 1_000_000;
        }
        if (m.contains("claude-3-5") || m.contains("claude-3.5") || m.contains("claude-3-opus") || m.contains("claude")) {
            return 200_000;
        }
        if (m.contains("gpt-4o") || m.contains("gpt-4-turbo")) {
            return 128_000;
        }
        if (m.contains("llama-3.1") || m.contains("llama-3.2") || m.contains("mistral-large")) {
            return 128_000;
        }
        if (m.contains("llama-3") || m.contains("llama3")) {
            return 8_192;
        }
        return 32_000; // safe fallback for compact/local models
    }

    /**
     * Computes the effective token threshold representing the model's "Smart Zone".
     */
    public int getSmartZoneTokenLimit() {
        int maxWindow = resolveModelContextWindow(activeModel);
        int calculated = (int) Math.round(maxWindow * smartZonePercentage);
        return Math.min(calculated, maxTokenCeiling);
    }

    /**
     * Fast, lightweight token estimation (~4 characters per token for English & code).
     */
    public int estimateTokens(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return (text.length() + 3) / 4;
    }

    /**
     * Checks if the provided text exceeds the model's Smart Zone threshold.
     */
    public boolean exceedsSmartZone(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return estimateTokens(text) > getSmartZoneTokenLimit();
    }

    /**
     * Determines whether content should be processed In-Context or via Vector RAG.
     */
    public RoutingStrategy determineStrategy(String content) {
        return exceedsSmartZone(content) ? RoutingStrategy.VECTOR_RAG : RoutingStrategy.IN_CONTEXT;
    }

    /**
     * Decides whether the chat pipeline should engage the vector store RAG advisor.
     */
    public boolean shouldUseRag(StudySession session, boolean hasVectors) {
        if (session == null || session.getContextType() == null) {
            return false;
        }

        if (session.getContextType() == ContextType.PDF) {
            return true;
        }

        return hasVectors;
    }

    public String getActiveModel() {
        return activeModel;
    }

    public double getSmartZonePercentage() {
        return smartZonePercentage;
    }

    public int getMaxTokenCeiling() {
        return maxTokenCeiling;
    }
}
