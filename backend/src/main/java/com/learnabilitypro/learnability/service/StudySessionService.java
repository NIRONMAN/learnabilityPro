package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.CreateSessionRequest;
import com.learnabilitypro.learnability.domain.dto.StudySessionDto;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.entity.User;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import com.learnabilitypro.learnability.domain.repository.UserRepository;
import com.learnabilitypro.learnability.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StudySessionService {

    private final StudySessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final RagService ragService;

    public StudySessionService(
            StudySessionRepository sessionRepository,
            UserRepository userRepository,
            @Autowired(required = false) RagService ragService) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.ragService = ragService;
    }

    public StudySessionService(StudySessionRepository sessionRepository, UserRepository userRepository) {
        this(sessionRepository, userRepository, null);
    }

    @Transactional
    public StudySessionDto createSession(UUID userId, CreateSessionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String title = resolveSessionTitle(request.title(), request.contextText(), request.sourceUrl());

        StudySession session = StudySession.builder()
                .user(user)
                .title(title)
                .sessionType(request.sessionType())
                .contextType(request.contextType())
                .sourceUrl(request.sourceUrl())
                .contextText(request.contextText())
                .build();

        session = sessionRepository.save(session);
        return toDto(session);
    }

    @Transactional(readOnly = true)
    public List<StudySessionDto> getUserSessions(UUID userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudySessionDto getSessionById(UUID sessionId, UUID userId) {
        StudySession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        return toDto(session);
    }

    public StudySessionDto toDto(StudySession session) {
        boolean vectorStoreActive = hasVectorStore(session);
        List<String> suggestions = generateSuggestedQuestions(
                session.getTitle(),
                session.getContextType(),
                session.getContextText()
        );
        return StudySessionDto.fromEntity(session, vectorStoreActive, suggestions);
    }

    public boolean hasVectorStore(StudySession session) {
        if (session == null || session.getContextType() == null) {
            return false;
        }
        if (session.getContextType() == ContextType.PDF) {
            return true;
        }
        if (ragService != null && session.getId() != null && ragService.hasVectors(session.getId())) {
            return true;
        }
        if (session.getContextType() == ContextType.YOUTUBE) {
            return session.getSourceUrl() != null && !session.getSourceUrl().isBlank()
                    && session.getContextText() != null && !session.getContextText().isBlank();
        }
        return false;
    }

    public List<String> generateSuggestedQuestions(String title, ContextType contextType, String contextText) {
        if (contextText == null || contextText.isBlank()) {
            if (title != null && !title.isBlank() && !isDefaultTitle(title)) {
                String cleanTopic = cleanTopicName(title);
                return List.of(
                        "What are the foundational principles of " + cleanTopic + "?",
                        "Can you explain " + cleanTopic + " with a real-world example?",
                        "What are common misconceptions about " + cleanTopic + "?"
                );
            }
            return List.of(
                    "What are the foundational principles of this topic?",
                    "Can you explain this with a real-world example?",
                    "What are common misconceptions about this?"
            );
        }

        String combined = ((title != null ? title : "") + " " + contextText).toLowerCase();
        if (isMathOrTechnicalContext(combined)) {
            String cleanTopic = cleanTopicName(title);
            return List.of(
                    "Can you walk through the mathematical derivation of " + cleanTopic + " step by step?",
                    "What are the core trade-offs and complexity limitations in this approach?",
                    "Can you provide an intuitive proof or justification for these formulas?"
            );
        }

        String cleanTopic = cleanTopicName(title);
        return List.of(
                "What are the core arguments and central concepts of " + cleanTopic + "?",
                "Can you break down the key terminology and definitions cited here?",
                "How can I test my understanding of this material with active recall questions?"
        );
    }

    private boolean isDefaultTitle(String title) {
        return title.equalsIgnoreCase("Generalized Study Session") || title.equalsIgnoreCase("Curated Study Session");
    }

    private String cleanTopicName(String title) {
        if (title == null || title.isBlank() || isDefaultTitle(title)) {
            return "this topic";
        }
        String cleaned = title.replaceAll("\\([^)]*\\)", "").trim();
        cleaned = cleaned.replaceAll("[:,-]+$", "").trim();
        return cleaned.isEmpty() ? "this topic" : cleaned;
    }

    private boolean isMathOrTechnicalContext(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase();
        return lower.contains("derivative") || lower.contains("integral") || lower.contains("equation")
                || lower.contains("gradient") || lower.contains("matrix") || lower.contains("vector")
                || lower.contains("proof") || lower.contains("theorem") || lower.contains("algorithm")
                || lower.contains("trade-off") || lower.contains("tradeoff") || lower.contains("complexity")
                || lower.contains("optimization") || lower.contains("eigenvalue") || lower.contains("attention")
                || lower.contains("policy") || lower.contains("o(") || lower.contains("=") || lower.contains("∑")
                || lower.contains("∫") || lower.contains("θ") || lower.contains("β") || lower.contains("λ")
                || lower.contains("√");
    }

    public String resolveSessionTitle(String title, String contextText, String sourceUrl) {
        if (title != null && !title.isBlank()) {
            return title.trim();
        }
        if (contextText != null && !contextText.isBlank()) {
            String derived = deriveTitleFromContext(contextText);
            if (derived != null && !derived.isBlank()) {
                return derived;
            }
        }
        if (sourceUrl != null && !sourceUrl.isBlank()) {
            String derived = deriveTitleFromSourceUrl(sourceUrl);
            if (derived != null && !derived.isBlank()) {
                return derived;
            }
        }
        return "Generalized Study Session";
    }

    public String deriveTitleFromContext(String contextText) {
        if (contextText == null || contextText.isBlank()) {
            return null;
        }
        String firstLine = contextText.lines()
                .map(String::trim)
                .filter(l -> !l.isBlank())
                .findFirst()
                .orElse("");

        String cleaned = firstLine.replaceAll("^[#§*\\d\\.\\s:-]+", "").trim();
        if (cleaned.isBlank()) {
            cleaned = firstLine.trim();
        }

        int dotIdx = cleaned.indexOf('.');
        if (dotIdx > 0 && dotIdx < cleaned.length() - 1 && cleaned.charAt(dotIdx + 1) == ' ') {
            cleaned = cleaned.substring(0, dotIdx).trim();
        }

        String[] words = cleaned.split("\\s+");
        if (words.length > 8) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                if (i > 0) sb.append(" ");
                sb.append(words[i]);
            }
            return sb.toString();
        }
        return cleaned.isEmpty() ? null : cleaned;
    }

    public String deriveTitleFromSourceUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return null;
        }
        String url = sourceUrl.trim();
        if (url.contains("youtube.com") || url.contains("youtu.be")) {
            Pattern pattern = Pattern.compile("(?:v=|/v/|youtu\\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})");
            Matcher matcher = pattern.matcher(url);
            if (matcher.find()) {
                return "YouTube: " + matcher.group(1);
            }
            return "YouTube Study Session";
        }

        try {
            String path = url;
            if (path.contains("?")) {
                path = path.substring(0, path.indexOf('?'));
            }
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                path = path.substring(lastSlash + 1);
            }
            path = path.replaceFirst("\\.[a-zA-Z0-9]+$", "")
                    .replace('-', ' ')
                    .replace('_', ' ')
                    .trim();
            if (!path.isBlank()) {
                return Character.toUpperCase(path.charAt(0)) + path.substring(1);
            }
        } catch (Exception ignored) {
        }
        return "Study Session: " + url;
    }

    @Transactional(readOnly = true)
    public StudySession getSessionEntity(UUID sessionId, UUID userId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
    }

    @Transactional
    public void deleteSession(UUID sessionId, UUID userId) {
        StudySession session = getSessionEntity(sessionId, userId);
        sessionRepository.delete(session);
    }

    @Transactional
    public void appendContextText(UUID sessionId, String text) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            String current = session.getContextText();
            session.setContextText(current == null || current.isBlank() ? text : current + "\n\n" + text);
            sessionRepository.save(session);
        });
    }
}
