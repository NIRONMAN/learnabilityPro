package com.learnabilitypro.learnability.domain.dto;

import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StudySessionDto(
        UUID id,
        UUID userId,
        String title,
        SessionType sessionType,
        ContextType contextType,
        String sourceUrl,
        String contextText,
        boolean hasVectorStore,
        List<String> suggestedQuestions,
        Instant createdAt,
        Instant updatedAt
) {
    public boolean ragEnabled() {
        return hasVectorStore;
    }

    public StudySessionDto(
            UUID id,
            UUID userId,
            String title,
            SessionType sessionType,
            ContextType contextType,
            String sourceUrl,
            String contextText,
            Instant createdAt,
            Instant updatedAt) {
        this(id, userId, title, sessionType, contextType, sourceUrl, contextText, false, List.of(), createdAt, updatedAt);
    }

    public static StudySessionDto fromEntity(
            StudySession session,
            boolean hasVectorStore,
            List<String> suggestedQuestions) {
        return new StudySessionDto(
                session.getId(),
                session.getUser() != null ? session.getUser().getId() : null,
                session.getTitle(),
                session.getSessionType(),
                session.getContextType(),
                session.getSourceUrl(),
                session.getContextText(),
                hasVectorStore,
                suggestedQuestions != null ? suggestedQuestions : List.of(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }

    public static StudySessionDto fromEntity(StudySession session) {
        return fromEntity(session, false, List.of());
    }
}
