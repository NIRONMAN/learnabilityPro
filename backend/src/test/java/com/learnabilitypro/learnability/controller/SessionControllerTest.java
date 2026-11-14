package com.learnabilitypro.learnability.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnabilitypro.learnability.domain.dto.CreateSessionRequest;
import com.learnabilitypro.learnability.domain.dto.StudySessionDto;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.security.UserPrincipal;
import com.learnabilitypro.learnability.service.StudySessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SessionControllerTest {

    @Mock
    private StudySessionService sessionService;

    @InjectMocks
    private SessionController sessionController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private UUID userId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(sessionController)
                .setCustomArgumentResolvers(new org.springframework.web.method.support.HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
                        return parameter.getParameterType().equals(UserPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                                                  org.springframework.web.method.support.ModelAndViewContainer mavContainer,
                                                  org.springframework.web.context.request.NativeWebRequest webRequest,
                                                  org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                        return new UserPrincipal(userId, "test@example.com", "password", Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
                    }
                })
                .build();
        objectMapper = new ObjectMapper();
        userId = UUID.randomUUID();
    }

    @Test
    void createSessionWithNullTitleSucceedsAndReturnsDto() throws Exception {
        CreateSessionRequest request = new CreateSessionRequest(
                null,
                SessionType.LEARN,
                ContextType.TOPIC,
                null,
                "Introduction to Neural Networks"
        );

        StudySessionDto dto = new StudySessionDto(
                UUID.randomUUID(),
                userId,
                "Introduction to Neural Networks",
                SessionType.LEARN,
                ContextType.TOPIC,
                null,
                "Introduction to Neural Networks",
                false,
                List.of("What are the foundational principles of this topic?"),
                Instant.now(),
                Instant.now()
        );

        when(sessionService.createSession(eq(userId), any(CreateSessionRequest.class))).thenReturn(dto);

        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Introduction to Neural Networks"))
                .andExpect(jsonPath("$.hasVectorStore").value(false))
                .andExpect(jsonPath("$.suggestedQuestions[0]").value("What are the foundational principles of this topic?"));
    }
}
