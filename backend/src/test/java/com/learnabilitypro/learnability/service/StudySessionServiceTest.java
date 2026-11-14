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

    @Test
    void createSessionWithNullTitleAutoGeneratesFromContextText() {
        CreateSessionRequest request = new CreateSessionRequest(
                null,
                SessionType.LEARN,
                ContextType.PDF,
                null,
                "§ 3.2 Multi-Head Attention Mechanism\nAn attention function can be described..."
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(sessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> {
            StudySession session = invocation.getArgument(0);
            session.setId(UUID.randomUUID());
            return session;
        });

        StudySessionDto created = sessionService.createSession(userId, request);

        assertThat(created).isNotNull();
        assertThat(created.title()).isEqualTo("Multi-Head Attention Mechanism");
        assertThat(created.hasVectorStore()).isTrue();
        assertThat(created.suggestedQuestions()).isNotEmpty();
    }

    @Test
    void createSessionWithBlankTitleAutoGeneratesFromSourceUrl() {
        CreateSessionRequest request = new CreateSessionRequest(
                "   ",
                SessionType.LEARN,
                ContextType.YOUTUBE,
                "https://www.youtube.com/watch?v=jGwO_UgTS7I",
                null
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(sessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> {
            StudySession session = invocation.getArgument(0);
            session.setId(UUID.randomUUID());
            return session;
        });

        StudySessionDto created = sessionService.createSession(userId, request);

        assertThat(created).isNotNull();
        assertThat(created.title()).isEqualTo("YouTube: jGwO_UgTS7I");
    }

    @Test
    void createSessionWithNullTitleAndNoContextOrUrlFallsBackToGeneralized() {
        CreateSessionRequest request = new CreateSessionRequest(
                null,
                SessionType.LEARN,
                ContextType.TOPIC,
                null,
                null
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(sessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> {
            StudySession session = invocation.getArgument(0);
            session.setId(UUID.randomUUID());
            return session;
        });

        StudySessionDto created = sessionService.createSession(userId, request);

        assertThat(created).isNotNull();
        assertThat(created.title()).isEqualTo("Generalized Study Session");
        assertThat(created.hasVectorStore()).isFalse();
        assertThat(created.suggestedQuestions()).contains(
                "What are the foundational principles of this topic?",
                "Can you explain this with a real-world example?",
                "What are common misconceptions about this?"
        );
    }

    @Test
    void generateSuggestedQuestionsForMathTechnicalContext() {
        List<String> questions = sessionService.generateSuggestedQuestions(
                "Transformer Models",
                ContextType.PDF,
                "The loss function is minimized using gradient descent and matrix multiplication. Complexity is O(n^2)."
        );

        assertThat(questions).hasSize(3);
        assertThat(questions.get(0)).contains("mathematical derivation");
        assertThat(questions.get(1)).contains("core trade-offs and complexity limitations");
        assertThat(questions.get(2)).contains("intuitive proof or justification");
    }

    @Test
    void generateSuggestedQuestionsForLiteratureContext() {
        List<String> questions = sessionService.generateSuggestedQuestions(
                "Hamlet Soliloquy",
                ContextType.TOPIC,
                "To be or not to be, that is the question. The tragic flaws of moral paralysis."
        );

        assertThat(questions).hasSize(3);
        assertThat(questions.get(0)).contains("core arguments and central concepts of Hamlet Soliloquy");
        assertThat(questions.get(1)).contains("terminology and definitions");
        assertThat(questions.get(2)).contains("active recall");
    }

    @Test
    void generateSuggestedQuestionsForResumeContext() {
        List<String> questions = sessionService.generateSuggestedQuestions(
                "niranjan_dabhade_software_engineer",
                ContextType.PDF,
                "Work Experience Findability Sciences Jr. Software Engineer Java Backend Engineer Spring Boot Kafka BigQuery"
        );

        assertThat(questions).hasSize(3);
        assertThat(questions.get(0)).contains("technical proficiencies");
        assertThat(questions.get(0)).contains("Niranjan Dabhade Software Engineer");
        assertThat(questions.get(1)).contains("engineering achievements");
        assertThat(questions.get(2)).contains("interview questions");
    }

    @Test
    void cleanTopicNameFormatsSnakeCaseAndExtensions() {
        assertThat(sessionService.cleanTopicName("niranjan_dabhade_software_engineer.pdf"))
                .isEqualTo("Niranjan Dabhade Software Engineer");
        assertThat(sessionService.cleanTopicName("attention_is_all_you_need"))
                .isEqualTo("Attention Is All You Need");
    }

    @Test
    void hasVectorStoreIdentifiesContextTypesCorrectly() {
        StudySession pdfSession = StudySession.builder()
                .id(UUID.randomUUID())
                .contextType(ContextType.PDF)
                .build();
        StudySession topicSession = StudySession.builder()
                .id(UUID.randomUUID())
                .contextType(ContextType.TOPIC)
                .build();
        StudySession youtubeSessionWithTranscript = StudySession.builder()
                .id(UUID.randomUUID())
                .contextType(ContextType.YOUTUBE)
                .sourceUrl("https://youtube.com/watch?v=123")
                .contextText("Transcribed lecture content")
                .build();

        assertThat(sessionService.hasVectorStore(pdfSession)).isTrue();
        assertThat(sessionService.hasVectorStore(topicSession)).isFalse();
        assertThat(sessionService.hasVectorStore(youtubeSessionWithTranscript)).isTrue();
    }
}
