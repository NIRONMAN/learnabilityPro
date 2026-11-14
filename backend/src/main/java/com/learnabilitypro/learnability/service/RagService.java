package com.learnabilitypro.learnability.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final VectorStore vectorStore;
    private final Set<UUID> indexedSessions = ConcurrentHashMap.newKeySet();

    public RagService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public QuestionAnswerAdvisor createSessionAdvisor(UUID sessionId) {
        SearchRequest searchRequest = SearchRequest.builder()
                .topK(4)
                .similarityThreshold(0.30)
                .filterExpression("sessionId == '" + sessionId + "'")
                .build();

        return QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(searchRequest)
                .build();
    }

    public List<Document> searchContext(UUID sessionId, String query) {
        try {
            SearchRequest searchRequest = SearchRequest.builder()
                    .query(query)
                    .topK(4)
                    .similarityThreshold(0.30)
                    .filterExpression("sessionId == '" + sessionId + "'")
                    .build();

            return vectorStore.similaritySearch(searchRequest);
        } catch (Exception e) {
            log.warn("Vector store search failed or empty for session {}: {}", sessionId, e.getMessage());
            return List.of();
        }
    }

    public void addDocuments(List<Document> documents) {
        if (documents != null && !documents.isEmpty()) {
            vectorStore.add(documents);
            for (Document doc : documents) {
                Object sid = doc.getMetadata().get("sessionId");
                if (sid != null) {
                    try {
                        indexedSessions.add(UUID.fromString(sid.toString()));
                    } catch (Exception ignored) {
                    }
                }
            }
        }
    }

    public boolean hasVectors(UUID sessionId) {
        if (sessionId == null) {
            return false;
        }
        return indexedSessions.contains(sessionId);
    }

    public void markSessionIndexed(UUID sessionId) {
        if (sessionId != null) {
            indexedSessions.add(sessionId);
        }
    }
}
