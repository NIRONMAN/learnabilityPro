package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.CreateSessionRequest;
import com.learnabilitypro.learnability.domain.dto.StudySessionDto;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.entity.User;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import com.learnabilitypro.learnability.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceTest {

    @Mock
    private StudySessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StudySessionService sessionService;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("learner@test.com")
                .name("Learner")
                .build();
    }

    @Test
    void createSessionSuccessfully() {
        CreateSessionRequest request = new CreateSessionRequest(
                "Linear Algebra",
                SessionType.LEARN,
                ContextType.PDF,
                "notes.pdf",
                "Eigenvalues and eigenvectors"
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(sessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> {
            StudySession session = invocation.getArgument(0);
            session.setId(UUID.randomUUID());
            return session;
        });

        StudySessionDto created = sessionService.createSession(userId, request);

        assertThat(created).isNotNull();
        assertThat(created.title()).isEqualTo("Linear Algebra");
        assertThat(created.sessionType()).isEqualTo(SessionType.LEARN);
        assertThat(created.contextType()).isEqualTo(ContextType.PDF);
        verify(sessionRepository, times(1)).save(any(StudySession.class));
    }

    @Test
    void getUserSessionsReturnsOrderedList() {
        StudySession s1 = StudySession.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .title("Quantum Computing")
                .sessionType(SessionType.REVISE)
                .contextType(ContextType.TOPIC)
                .build();

        when(sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId)).thenReturn(List.of(s1));

        List<StudySessionDto> sessions = sessionService.getUserSessions(userId);

        assertThat(sessions).hasSize(1);
        assertThat(sessions.get(0).title()).isEqualTo("Quantum Computing");
    }
}
