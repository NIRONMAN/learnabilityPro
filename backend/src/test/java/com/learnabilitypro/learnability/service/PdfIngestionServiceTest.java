package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.IngestResponse;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PdfIngestionServiceTest {

    @Mock
    private RagService ragService;

    @Mock
    private ChatClient chatClient;

    @Mock
    private StudySessionService sessionService;

    @Mock
    private StudySessionRepository sessionRepository;

    private PdfIngestionService pdfIngestionService;

    @BeforeEach
    void setUp() {
        pdfIngestionService = new PdfIngestionService(ragService, chatClient, sessionService, sessionRepository);
    }

    private byte[] createSamplePdf(String text) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText(text);
                cs.endText();
            }
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    @Test
    void testIngestPdfSuccessful() throws IOException {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        StudySession session = StudySession.builder()
                .id(sessionId)
                .title("Attention Mechanism")
                .sessionType(SessionType.LEARN)
                .contextType(ContextType.PDF)
                .build();

        when(sessionService.getSessionEntity(eq(sessionId), eq(userId))).thenReturn(session);

        byte[] pdfBytes = createSamplePdf("Transformer architectures rely entirely on self-attention mechanisms for computing representations of their input and output without using sequence-aligned RNNs or convolution.");
        MockMultipartFile file = new MockMultipartFile("file", "vaswani2017.pdf", "application/pdf", pdfBytes);

        IngestResponse response = pdfIngestionService.ingestPdf(file, sessionId, userId);

        assertThat(response).isNotNull();
        assertThat(response.sessionId()).isEqualTo(sessionId);
        assertThat(response.chunkCount()).isGreaterThan(0);
        verify(ragService, times(1)).addDocuments(any());
        verify(sessionService, times(1)).appendContextText(eq(sessionId), any());
    }

    @Test
    void testIngestPdfEmptyTextThrowsException() throws IOException {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        // PDF with empty page
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage());
            doc.save(baos);
        }
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", baos.toByteArray());

        assertThatThrownBy(() -> pdfIngestionService.ingestPdf(file, sessionId, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not contain extractable text");
    }
}
