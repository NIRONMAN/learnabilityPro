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

    @Autowired
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
        String cleanTopic = cleanTopicName(title);
        if (contextText == null || contextText.isBlank()) {
            if (title != null && !title.isBlank() && !isDefaultTitle(title)) {
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

        // 1. Resume / CV / Candidate Profile
        if (isResumeOrProfileContext(combined, title)) {
            return List.of(
                    "What are the core technical proficiencies and career highlights in " + cleanTopic + "?",
                    "Can you break down the key engineering achievements and impact metrics described here?",
                    "What technical interview questions would you ask based on the projects and experience in this profile?"
            );
        }

        // 2. Mathematics / Formal Proofs / Deep Theoretical ML
        if (isMathOrTheoreticalContext(combined)) {
            return List.of(
                    "Can you walk through the mathematical derivation of " + cleanTopic + " step by step?",
                    "What are the core trade-offs and complexity limitations in this approach?",
                    "Can you provide an intuitive proof or justification for these formulas?"
            );
        }

        // 3. Academic Research / Empirical Papers
        if (isAcademicResearchContext(combined)) {
            return List.of(
                    "What is the central research hypothesis and primary contribution of " + cleanTopic + "?",
                    "How was the experimental methodology structured, and what do the empirical results demonstrate?",
                    "What are the key limitations and potential avenues for future research noted here?"
            );
        }

        // 4. Software Engineering / System Architecture
        if (isSoftwareEngineeringContext(combined, title)) {
            return List.of(
                    "What are the key architectural patterns and system components in " + cleanTopic + "?",
                    "What are the core trade-offs, scalability considerations, and performance bottlenecks in this design?",
                    "How do the services and data pipelines interact across this technical implementation?"
            );
        }

        // 5. General / Humanities / Literature / Default
        return List.of(
                "What are the core arguments and central concepts of " + cleanTopic + "?",
                "Can you break down the key terminology and definitions cited here?",
                "How can I test my understanding of this material with active recall questions?"
        );
    }

    private boolean isDefaultTitle(String title) {
        return title.equalsIgnoreCase("Generalized Study Session") || title.equalsIgnoreCase("Curated Study Session");
    }

    public String cleanTopicName(String title) {
        if (title == null || title.isBlank() || isDefaultTitle(title)) {
            return "this topic";
        }
        String cleaned = title.replaceFirst("(?i)\\.(pdf|docx|txt|md|html|json)$", "").trim();
        cleaned = cleaned.replaceAll("\\([^)]*\\)", " ").trim();
        cleaned = cleaned.replaceAll("[_\\-]+", " ");
        cleaned = cleaned.replaceAll("[:,-]+$", "").trim();
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        if (cleaned.isEmpty()) {
            return "this topic";
        }

        // Convert to title case if all lowercase or all uppercase
        if (cleaned.equals(cleaned.toLowerCase()) || cleaned.equals(cleaned.toUpperCase())) {
            String[] words = cleaned.split(" ");
            StringBuilder sb = new StringBuilder();
            for (String word : words) {
                if (!word.isBlank()) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(Character.toUpperCase(word.charAt(0)))
                            .append(word.substring(1).toLowerCase());
                }
            }
            cleaned = sb.toString();
        }
        return cleaned;
    }

    private boolean isResumeOrProfileContext(String text, String title) {
        String combined = ((title != null ? title : "") + " " + (text != null ? text : "")).toLowerCase();
        boolean hasResumeTerm = combined.contains("resume") || combined.contains("curriculum vitae")
                || combined.contains("work experience") || combined.contains("employment history")
                || combined.contains("professional experience") || combined.contains("career summary")
                || combined.contains("candidate") || combined.contains("portfolio")
                || combined.contains("bachelor of") || combined.contains("master of")
                || (combined.contains("education") && (combined.contains("skills") || combined.contains("technologies") || combined.contains("projects")));

        boolean hasRoleTerm = combined.contains("software engineer") || combined.contains("backend engineer")
                || combined.contains("frontend engineer") || combined.contains("full stack")
                || combined.contains("developer") || combined.contains("data scientist")
                || combined.contains("engineering intern") || combined.contains("intern");

        return hasResumeTerm && (hasRoleTerm || combined.contains("experience") || combined.contains("gpa") || combined.contains("linkedin") || combined.contains("leetcode"));
    }

    private boolean isMathOrTheoreticalContext(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase();
        boolean hasMathSymbols = lower.contains("∑") || lower.contains("∫") || lower.contains("θ")
                || lower.contains("β") || lower.contains("λ") || lower.contains("√")
                || lower.contains("\\frac") || lower.contains("\\sum") || lower.contains("\\int");

        boolean hasProofOrTheorem = (lower.contains("theorem") || lower.contains("lemma") || lower.contains("corollary"))
                && (lower.contains("proof") || lower.contains("proved") || lower.contains("qed"));

        boolean hasCalculusOrLinearAlgebra = lower.contains("eigenvalue") || lower.contains("eigenvector")
                || lower.contains("differential equation") || lower.contains("partial differential")
                || (lower.contains("loss function") && (lower.contains("gradient") || lower.contains("descent") || lower.contains("matrix multiplication")))
                || (lower.contains("gradient descent") && lower.contains("matrix"));

        boolean hasAsymptoticComplexity = (lower.contains("complexity") && (lower.contains("o(n") || lower.contains("o(1") || lower.contains("o(log") || lower.contains("asymptotic")));

        return hasMathSymbols || hasProofOrTheorem || hasCalculusOrLinearAlgebra || hasAsymptoticComplexity;
    }

    private boolean isAcademicResearchContext(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase();
        return (lower.contains("abstract") || lower.contains("introduction"))
                && (lower.contains("methodology") || lower.contains("experimental results")
                || lower.contains("empirical") || lower.contains("ablation")
                || lower.contains("benchmark") || lower.contains("related work"));
    }

    private boolean isSoftwareEngineeringContext(String text, String title) {
        String combined = ((title != null ? title : "") + " " + (text != null ? text : "")).toLowerCase();
        return combined.contains("microservices") || combined.contains("system design")
                || combined.contains("kubernetes") || combined.contains("docker")
                || combined.contains("spring boot") || combined.contains("kafka")
                || combined.contains("redis") || combined.contains("rest api")
                || combined.contains("ci/cd") || combined.contains("gitops")
                || (combined.contains("architecture") && (combined.contains("database") || combined.contains("service") || combined.contains("pipeline")));
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

    @Transactional
    public void setSessionContext(UUID sessionId, String title, String contextText) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            if (title != null && !title.isBlank()) {
                session.setTitle(title);
            }
            if (contextText != null) {
                session.setContextText(contextText);
            }
            sessionRepository.save(session);
        });
    }

    @Transactional
    public void updateSessionTitle(UUID sessionId, String title) {
        if (title == null || title.isBlank()) return;
        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setTitle(title);
            sessionRepository.save(session);
        });
    }
}

