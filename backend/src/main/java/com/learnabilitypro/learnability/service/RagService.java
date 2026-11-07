package com.learnabilitypro.learnability.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final VectorStore vectorStore;

    public RagService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public QuestionAnswerAdvisor createSessionAdvisor(UUID sessionId) {
        SearchRequest searchRequest = SearchRequest.builder()
                .topK(4)
                .similarityThreshold(0.65)
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
                    .similarityThreshold(0.60)
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
        }
    }
}
