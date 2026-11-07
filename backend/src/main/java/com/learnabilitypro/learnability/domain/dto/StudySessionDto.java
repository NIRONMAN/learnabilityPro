package com.learnabilitypro.learnability.domain.dto;

import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;

import java.time.Instant;
import java.util.UUID;

public record StudySessionDto(
        UUID id,
        UUID userId,
        String title,
        SessionType sessionType,
        ContextType contextType,
        String sourceUrl,
        String contextText,
        Instant createdAt,
        Instant updatedAt
) {
    public static StudySessionDto fromEntity(StudySession session) {
        return new StudySessionDto(
                session.getId(),
                session.getUser() != null ? session.getUser().getId() : null,
                session.getTitle(),
                session.getSessionType(),
                session.getContextType(),
                session.getSourceUrl(),
                session.getContextText(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}
