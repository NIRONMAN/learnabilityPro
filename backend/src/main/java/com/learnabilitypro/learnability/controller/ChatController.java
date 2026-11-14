package com.learnabilitypro.learnability.controller;

import com.learnabilitypro.learnability.domain.dto.ChatMessageDto;
import com.learnabilitypro.learnability.domain.dto.ChatRequest;
import com.learnabilitypro.learnability.security.UserPrincipal;
import com.learnabilitypro.learnability.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@Tag(name = "AI Chat & Tutor", description = "Endpoints for real-time streaming AI tutoring and grounded chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/{sessionId}/send")
    @Operation(summary = "Send a chat message and receive synchronous AI tutor response")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(
                sessionId,
                principal.getId(),
                request.message(),
                request.videoTimestampSec(),
                request.playbackContext()
        ));
    }

    @GetMapping(value = "/{sessionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream AI tutor response via Server-Sent Events (SSE)")
    public Flux<ServerSentEvent<String>> streamMessage(
            @PathVariable UUID sessionId,
            @RequestParam String message,
            @RequestParam(required = false) Integer videoTimestampSec,
            @RequestParam(required = false) String playbackContext,
            @AuthenticationPrincipal UserPrincipal principal) {
        return chatService.streamMessage(sessionId, principal.getId(), message, videoTimestampSec, playbackContext)
                .map(chunk -> ServerSentEvent.<String>builder()
                        .data(chunk)
                        .event("message")
                        .build())
                .concatWith(Flux.just(ServerSentEvent.<String>builder().event("complete").data("[DONE]").build()));
    }

    @GetMapping("/{sessionId}/messages")
    @Operation(summary = "Get all chat messages for a study session")
    public ResponseEntity<List<ChatMessageDto>> getMessages(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(chatService.getSessionMessages(sessionId, principal.getId()));
    }
}
