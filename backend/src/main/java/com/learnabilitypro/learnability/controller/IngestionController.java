package com.learnabilitypro.learnability.controller;

import com.learnabilitypro.learnability.domain.dto.IngestResponse;
import com.learnabilitypro.learnability.domain.dto.YouTubeIngestRequest;
import com.learnabilitypro.learnability.security.UserPrincipal;
import com.learnabilitypro.learnability.service.PdfIngestionService;
import com.learnabilitypro.learnability.service.YouTubeTranscriptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/ingest")
@Tag(name = "Document & Media Ingestion", description = "Endpoints for ingesting PDFs and YouTube lectures into vector store")
public class IngestionController {

    private final PdfIngestionService pdfIngestionService;
    private final YouTubeTranscriptService youTubeTranscriptService;

    public IngestionController(PdfIngestionService pdfIngestionService, YouTubeTranscriptService youTubeTranscriptService) {
        this.pdfIngestionService = pdfIngestionService;
        this.youTubeTranscriptService = youTubeTranscriptService;
    }

    @PostMapping(value = "/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and ingest a PDF document into the study session and vector store")
    public ResponseEntity<IngestResponse> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sessionId", required = false) UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        return ResponseEntity.ok(pdfIngestionService.ingestPdf(file, sessionId, principal.getId()));
    }

    @PostMapping("/youtube")
    @Operation(summary = "Ingest a YouTube video transcript/content into the study session and vector store")
    public ResponseEntity<IngestResponse> ingestYouTube(
            @Valid @RequestBody YouTubeIngestRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(youTubeTranscriptService.ingestYouTube(request, principal.getId()));
    }

    @GetMapping(value = "/pdf/{sessionId}", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Stream or view the raw PDF file for an authorized session")
    public ResponseEntity<org.springframework.core.io.Resource> getPdf(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        org.springframework.core.io.Resource pdf = pdfIngestionService.getPdfResource(sessionId, principal.getId());
        if (pdf == null || !pdf.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + sessionId + ".pdf\"")
                .body(pdf);
    }

    @GetMapping("/pdf/{sessionId}/status")
    @Operation(summary = "Check if PDF binary file exists on server for this session")
    public ResponseEntity<java.util.Map<String, Object>> getPdfStatus(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean exists = pdfIngestionService.hasPdfFile(sessionId);
        return ResponseEntity.ok(java.util.Map.of("hasPdf", exists, "sessionId", sessionId));
    }
}
