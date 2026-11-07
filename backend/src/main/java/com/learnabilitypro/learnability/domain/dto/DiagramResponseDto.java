package com.learnabilitypro.learnability.domain.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

public record DiagramResponseDto(
        @JsonPropertyDescription("A concise title for the diagram")
        String title,

        @JsonPropertyDescription("The diagram type, such as flowchart TD, flowchart LR, mindmap, or sequenceDiagram")
        String diagramType,

        @JsonPropertyDescription("Valid Mermaid.js syntax for the diagram without markdown fence backticks")
        String mermaidCode,

        @JsonPropertyDescription("A brief explanation of the concepts depicted in the diagram")
        String explanation
) {}
