package com.learnabilitypro.learnability.controller;

import com.learnabilitypro.learnability.domain.dto.CreateSessionRequest;
import com.learnabilitypro.learnability.domain.dto.StudySessionDto;
import com.learnabilitypro.learnability.security.UserPrincipal;
import com.learnabilitypro.learnability.service.StudySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@Tag(name = "Sessions", description = "Endpoints for creating and retrieving persistent study sessions")
public class SessionController {

    private final StudySessionService sessionService;

    public SessionController(StudySessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    @Operation(summary = "Create a new study session")
    public ResponseEntity<StudySessionDto> createSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateSessionRequest request) {
        StudySessionDto session = sessionService.createSession(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping
    @Operation(summary = "List all study sessions for the authenticated user")
    public ResponseEntity<List<StudySessionDto>> listSessions(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(sessionService.getUserSessions(principal.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get study session details by ID")
    public ResponseEntity<StudySessionDto> getSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(sessionService.getSessionById(id, principal.getId()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a study session")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        sessionService.deleteSession(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
