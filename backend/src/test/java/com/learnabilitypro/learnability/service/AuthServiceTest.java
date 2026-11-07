package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.AuthRequest;
import com.learnabilitypro.learnability.domain.dto.AuthResponse;
import com.learnabilitypro.learnability.domain.entity.User;
import com.learnabilitypro.learnability.domain.repository.UserRepository;
import com.learnabilitypro.learnability.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerNewUserSuccessfully() {
        AuthRequest request = new AuthRequest("alex@learnability.pro", "password123", "Alex");

        when(userRepository.existsByEmail("alex@learnability.pro")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(tokenProvider.generateToken(any(), eq("alex@learnability.pro"))).thenReturn("mock.jwt.token");

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("mock.jwt.token");
        assertThat(response.user().email()).isEqualTo("alex@learnability.pro");
        assertThat(response.user().name()).isEqualTo("Alex");
    }

    @Test
    void registerExistingEmailThrowsException() {
        AuthRequest request = new AuthRequest("existing@learnability.pro", "password123", "User");
        when(userRepository.existsByEmail("existing@learnability.pro")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already registered");
    }
}
