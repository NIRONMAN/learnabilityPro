package com.learnabilitypro.learnability.domain.dto;

import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.MessageSender;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageDto(
        UUID id,
        UUID sessionId,
        MessageSender sender,
        String content,
        Instant createdAt
) {
    public static ChatMessageDto fromEntity(ChatMessage message) {
        return new ChatMessageDto(
                message.getId(),
                message.getSession() != null ? message.getSession().getId() : null,
                message.getSender(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
