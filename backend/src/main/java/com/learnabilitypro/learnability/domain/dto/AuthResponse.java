package com.learnabilitypro.learnability.domain.dto;

public record AuthResponse(
        String token,
        String tokenType,
        UserDto user
) {
    public AuthResponse(String token, UserDto user) {
        this(token, "Bearer", user);
    }
}
