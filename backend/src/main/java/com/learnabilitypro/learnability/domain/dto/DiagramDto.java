package com.learnabilitypro.learnability.domain.dto;

import com.learnabilitypro.learnability.domain.entity.Diagram;

import java.time.Instant;
import java.util.UUID;

public record DiagramDto(
        UUID id,
        UUID sessionId,
        String diagramType,
        String title,
        String mermaidCode,
        String explanation,
        Instant createdAt
) {
    public static DiagramDto fromEntity(Diagram diagram) {
        return new DiagramDto(
                diagram.getId(),
                diagram.getSession() != null ? diagram.getSession().getId() : null,
                diagram.getDiagramType(),
                diagram.getTitle(),
                diagram.getMermaidCode(),
                diagram.getExplanation(),
                diagram.getCreatedAt()
        );
    }
}
