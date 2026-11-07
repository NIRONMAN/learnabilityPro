package com.learnabilitypro.learnability.domain.repository;

import com.learnabilitypro.learnability.domain.entity.FlashcardDeck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlashcardDeckRepository extends JpaRepository<FlashcardDeck, UUID> {
    List<FlashcardDeck> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);
    Optional<FlashcardDeck> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);
}
