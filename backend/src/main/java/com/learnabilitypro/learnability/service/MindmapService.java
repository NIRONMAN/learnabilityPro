package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.DiagramDto;
import com.learnabilitypro.learnability.domain.dto.DiagramResponseDto;
import com.learnabilitypro.learnability.domain.entity.Diagram;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.DiagramRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class MindmapService {

    private static final Logger log = LoggerFactory.getLogger(MindmapService.class);
    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:mermaid)?\\s*([\\s\\S]*?)\\s*```");

    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final DiagramRepository diagramRepository;

    public MindmapService(
            ChatClient chatClient,
            StudySessionService sessionService,
            DiagramRepository diagramRepository) {
        this.chatClient = chatClient;
        this.sessionService = sessionService;
        this.diagramRepository = diagramRepository;
    }

    @Transactional
    public DiagramDto generateDiagram(UUID sessionId, UUID userId, String customPrompt) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);

        String topic = session.getTitle();
        String context = session.getContextText() != null ? session.getContextText() : "";

        BeanOutputConverter<DiagramResponseDto> converter = new BeanOutputConverter<>(DiagramResponseDto.class);

        String prompt = """
                Synthesize a clean, highly structured Mermaid.js concept diagram or flowchart for the topic: %s.
                User instructions: %s
                Reference Context:
                %s

                Rules for Mermaid syntax:
                1. Diagram type must be one of: "flowchart TD", "flowchart LR", "mindmap", or "sequenceDiagram".
                2. Node labels with special characters or parentheses MUST be enclosed in double quotes (e.g. id["Label (Details)"]).
                3. Do NOT include markdown backticks (```) in the mermaidCode field; return raw Mermaid code only.
                4. Keep the diagram readable, concise, and logically organized.
                """.formatted(topic, customPrompt != null ? customPrompt : "Create a concept breakdown", context);

        DiagramResponseDto result;
        try {
            result = chatClient.prompt()
                    .system("You are an expert educational visualizer producing valid Mermaid.js diagrams. Output only JSON matching the schema.")
                    .user(u -> u.text(prompt + "\n\n" + converter.getFormat()))
                    .call()
                    .entity(converter);
        } catch (Exception ex) {
            log.error("Failed to generate structured diagram via BeanOutputConverter: {}", ex.getMessage());
            result = createFallbackDiagram(topic);
        }

        String cleanedMermaidCode = sanitizeMermaidCode(result.mermaidCode(), topic);

        Diagram diagram = Diagram.builder()
                .session(session)
                .title(result.title() != null ? result.title() : topic + " Concept Map")
                .diagramType(result.diagramType() != null ? result.diagramType() : "flowchart TD")
                .mermaidCode(cleanedMermaidCode)
                .explanation(result.explanation() != null ? result.explanation() : "Concept diagram for " + topic)
                .build();

        diagram = diagramRepository.save(diagram);
        return DiagramDto.fromEntity(diagram);
    }

    @Transactional(readOnly = true)
    public List<DiagramDto> getSessionDiagrams(UUID sessionId, UUID userId) {
        sessionService.getSessionEntity(sessionId, userId);
        return diagramRepository.findBySessionIdOrderByCreatedAtDesc(sessionId)
                .stream()
                .map(DiagramDto::fromEntity)
                .toList();
    }

    private String sanitizeMermaidCode(String rawCode, String topic) {
        if (rawCode == null || rawCode.isBlank()) {
            return createFallbackDiagram(topic).mermaidCode();
        }

        var matcher = CODE_BLOCK_PATTERN.matcher(rawCode.trim());
        String code = matcher.find() ? matcher.group(1).trim() : rawCode.trim();

        if (!code.startsWith("flowchart") && !code.startsWith("graph") && !code.startsWith("mindmap") && !code.startsWith("sequenceDiagram")) {
            code = "flowchart TD\n    " + code;
        }

        return code;
    }

    private DiagramResponseDto createFallbackDiagram(String topic) {
        String safeTopic = topic.replaceAll("[\"'\n]", "");
        String code = """
                flowchart TD
                    Root["%s"] --> CoreConcepts["Core Concepts"]
                    Root --> Applications["Applications & Use Cases"]
                    Root --> BestPractices["Best Practices & Pitfalls"]
                    CoreConcepts --> Sub1["Foundations"]
                    CoreConcepts --> Sub2["Mechanisms"]
                """.formatted(safeTopic);
        return new DiagramResponseDto(
                topic + " Overview",
                "flowchart TD",
                code.trim(),
                "Conceptual hierarchical overview of " + safeTopic
        );
    }
}
