package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.IngestResponse;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PdfIngestionService {

    private static final Logger log = LoggerFactory.getLogger(PdfIngestionService.class);

    private final RagService ragService;
    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final StudySessionRepository sessionRepository;

    public PdfIngestionService(
            RagService ragService,
            ChatClient chatClient,
            StudySessionService sessionService,
            StudySessionRepository sessionRepository) {
        this.ragService = ragService;
        this.chatClient = chatClient;
        this.sessionService = sessionService;
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public IngestResponse ingestPdf(MultipartFile file, UUID sessionId, UUID userId) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        Resource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        PagePdfDocumentReader pdfReader = new PagePdfDocumentReader(resource);
        List<Document> rawDocuments = pdfReader.get();

        if (rawDocuments == null || rawDocuments.isEmpty() || rawDocuments.stream().allMatch(d -> d.getText() == null || d.getText().isBlank())) {
            throw new IllegalArgumentException("The uploaded PDF does not contain extractable text. Please ensure it is not an image-only scanned document without an OCR layer.");
        }

        TokenTextSplitter splitter = TokenTextSplitter.builder()
                .withChunkSize(800)
                .withMinChunkSizeChars(350)
                .build();
        List<Document> splitDocuments = splitter.apply(rawDocuments);
        if (splitDocuments == null || splitDocuments.isEmpty()) {
            splitDocuments = rawDocuments.stream().filter(d -> d.getText() != null && !d.getText().isBlank()).toList();
        }

        StudySession session;
        if (sessionId != null) {
            session = sessionService.getSessionEntity(sessionId, userId);
        } else {
            String derivedTitle = filename.replaceFirst("\\.pdf$", "");
            com.learnabilitypro.learnability.domain.dto.CreateSessionRequest req =
                    new com.learnabilitypro.learnability.domain.dto.CreateSessionRequest(
                            derivedTitle,
                            SessionType.LEARN,
                            ContextType.PDF,
                            filename,
                            ""
                    );
            com.learnabilitypro.learnability.domain.dto.StudySessionDto created = sessionService.createSession(userId, req);
            session = sessionRepository.findById(created.id()).orElseThrow();
            sessionId = session.getId();
        }

        List<Document> taggedDocuments = new ArrayList<>();
        StringBuilder combinedSample = new StringBuilder();

        for (Document doc : splitDocuments) {
            doc.getMetadata().put("sessionId", sessionId.toString());
            doc.getMetadata().put("userId", userId.toString());
            doc.getMetadata().put("sourceFileName", filename);
            taggedDocuments.add(doc);

            if (combinedSample.length() < 3000) {
                combinedSample.append(doc.getText()).append("\n");
            }
        }

        ragService.addDocuments(taggedDocuments);

        String summary = generateQuickSummary(filename, combinedSample.toString());
        sessionService.appendContextText(sessionId, "Document: " + filename + "\n" + summary);

        return new IngestResponse(
                sessionId,
                session.getTitle(),
                taggedDocuments.size(),
                summary
        );
    }

    private String generateQuickSummary(String filename, String sampleText) {
        try {
            return chatClient.prompt()
                    .system("You are an academic summarizer. Provide a concise, high-impact 3-bullet summary of the core concepts in the provided document sample.")
                    .user("Document: " + filename + "\n\nContent:\n" + sampleText)
                    .call()
                    .content();
        } catch (Exception e) {
            log.warn("Summary generation fallback: {}", e.getMessage());
            return "Ingested " + filename + " with key topics extracted for tutoring and active recall.";
        }
    }
}
