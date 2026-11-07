package com.learnabilitypro.learnability.domain.repository;

import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, UUID> {
    List<StudySession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    List<StudySession> findByUserIdAndSessionTypeOrderByUpdatedAtDesc(UUID userId, SessionType sessionType);
    Optional<StudySession> findByIdAndUserId(UUID id, UUID userId);
}
