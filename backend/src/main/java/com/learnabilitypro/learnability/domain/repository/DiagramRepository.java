package com.learnabilitypro.learnability.domain.repository;

import com.learnabilitypro.learnability.domain.entity.Diagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiagramRepository extends JpaRepository<Diagram, UUID> {
    List<Diagram> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);
    Optional<Diagram> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);
}
