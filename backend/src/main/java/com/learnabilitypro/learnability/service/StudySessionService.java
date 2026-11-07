package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.CreateSessionRequest;
import com.learnabilitypro.learnability.domain.dto.StudySessionDto;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.entity.User;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import com.learnabilitypro.learnability.domain.repository.UserRepository;
import com.learnabilitypro.learnability.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StudySessionService {

    private final StudySessionRepository sessionRepository;
    private final UserRepository userRepository;

    public StudySessionService(StudySessionRepository sessionRepository, UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public StudySessionDto createSession(UUID userId, CreateSessionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        StudySession session = StudySession.builder()
                .user(user)
                .title(request.title())
                .sessionType(request.sessionType())
                .contextType(request.contextType())
                .sourceUrl(request.sourceUrl())
                .contextText(request.contextText())
                .build();

        session = sessionRepository.save(session);
        return StudySessionDto.fromEntity(session);
    }

    @Transactional(readOnly = true)
    public List<StudySessionDto> getUserSessions(UUID userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(StudySessionDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudySessionDto getSessionById(UUID sessionId, UUID userId) {
        StudySession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        return StudySessionDto.fromEntity(session);
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
