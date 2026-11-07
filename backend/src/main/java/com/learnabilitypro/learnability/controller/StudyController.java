package com.learnabilitypro.learnability.controller;

import com.learnabilitypro.learnability.domain.dto.DiagramDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardDeckDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardDto;
import com.learnabilitypro.learnability.domain.entity.Flashcard;
import com.learnabilitypro.learnability.domain.entity.FlashcardDeck;
import com.learnabilitypro.learnability.security.UserPrincipal;
import com.learnabilitypro.learnability.service.FlashcardService;
import com.learnabilitypro.learnability.service.MindmapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/study")
@Tag(name = "Study Tools", description = "Endpoints for generating flashcards, active recall drills, and Mermaid mindmaps")
public class StudyController {

    private final FlashcardService flashcardService;
    private final MindmapService mindmapService;

    public StudyController(FlashcardService flashcardService, MindmapService mindmapService) {
        this.flashcardService = flashcardService;
        this.mindmapService = mindmapService;
    }

    @PostMapping("/{sessionId}/flashcards")
    @Operation(summary = "Generate a strongly-typed flashcard deck for active recall")
    public ResponseEntity<FlashcardDeckDto> generateFlashcards(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) String topic,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(flashcardService.generateFlashcards(sessionId, principal.getId(), topic));
    }

    @GetMapping("/{sessionId}/flashcards")
    @Operation(summary = "Get all flashcard decks associated with a session")
    public ResponseEntity<List<FlashcardDeckDto>> getSessionDecks(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<FlashcardDeck> decks = flashcardService.getSessionDecks(sessionId, principal.getId());
        List<FlashcardDeckDto> dtos = decks.stream()
                .map(deck -> new FlashcardDeckDto(
                        deck.getTopic(),
                        deck.getFlashcards().stream()
                                .map(f -> new FlashcardDto(f.getQuestion(), f.getAnswer(), f.getHint()))
                                .toList()
                ))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/flashcards/{cardId}/mastery")
    @Operation(summary = "Update flashcard mastery level (0-5)")
    public ResponseEntity<Void> updateMastery(
            @PathVariable UUID cardId,
            @RequestParam int level) {
        flashcardService.updateMastery(cardId, level);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{sessionId}/diagram")
    @Operation(summary = "Synthesize a Mermaid.js mindmap or concept flowchart")
    public ResponseEntity<DiagramDto> generateDiagram(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) String prompt,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(mindmapService.generateDiagram(sessionId, principal.getId(), prompt));
    }

    @GetMapping("/{sessionId}/diagrams")
    @Operation(summary = "Get all diagrams and mindmaps synthesized for a session")
    public ResponseEntity<List<DiagramDto>> getSessionDiagrams(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(mindmapService.getSessionDiagrams(sessionId, principal.getId()));
    }
}
