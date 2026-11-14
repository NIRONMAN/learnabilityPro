package com.learnabilitypro.learnability.service;

import com.learnabilitypro.learnability.domain.dto.IngestResponse;
import com.learnabilitypro.learnability.domain.dto.YouTubeIngestRequest;
import com.learnabilitypro.learnability.domain.entity.ContextType;
import com.learnabilitypro.learnability.domain.entity.SessionType;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.StudySessionRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class YouTubeTranscriptService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeTranscriptService.class);
    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile("(?:v=|/v/|youtu\\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})");
    private static final Pattern CAPTION_URL_PATTERN = Pattern.compile("\"baseUrl\"\\s*:\\s*\"(https://www\\.youtube\\.com/api/timedtext[^\"]+)\"");

    private final HttpClient httpClient;
    private final RagService ragService;
    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final StudySessionRepository sessionRepository;

    public YouTubeTranscriptService(
            RagService ragService,
            ChatClient chatClient,
            StudySessionService sessionService,
            StudySessionRepository sessionRepository) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        this.ragService = ragService;
        this.chatClient = chatClient;
        this.sessionService = sessionService;
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public IngestResponse ingestYouTube(YouTubeIngestRequest request, UUID userId) {
        String videoId = extractVideoId(request.url());
        if (videoId == null) {
            throw new IllegalArgumentException("Invalid YouTube URL: " + request.url());
        }

        String rawTranscript = fetchCaptions(videoId);
        String sessionTitle = request.title() != null && !request.title().isBlank()
                ? request.title()
                : "YouTube Study: " + videoId;

        StudySession session;
        UUID sessionId = request.sessionId();
        if (sessionId != null) {
            session = sessionService.getSessionEntity(sessionId, userId);
        } else {
            var req = new com.learnabilitypro.learnability.domain.dto.CreateSessionRequest(
                    sessionTitle,
                    SessionType.LEARN,
                    ContextType.YOUTUBE,
                    request.url(),
                    ""
            );
            var created = sessionService.createSession(userId, req);
            session = sessionRepository.findById(created.id()).orElseThrow();
            sessionId = session.getId();
        }

        String transcriptText;
        if (rawTranscript != null && !rawTranscript.isBlank()) {
            transcriptText = rawTranscript;
        } else {
            transcriptText = generateConceptualSummaryFromVideo(request.url(), sessionTitle);
        }

        org.springframework.ai.document.Document initialDoc = new org.springframework.ai.document.Document(
                transcriptText,
                Map.of(
                        "sessionId", sessionId.toString(),
                        "userId", userId.toString(),
                        "sourceUrl", request.url(),
                        "videoId", videoId
                )
        );

        TokenTextSplitter splitter = TokenTextSplitter.builder()
                .withChunkSize(800)
                .withMinChunkSizeChars(350)
                .build();
        List<org.springframework.ai.document.Document> chunks = splitter.apply(List.of(initialDoc));

        for (org.springframework.ai.document.Document chunk : chunks) {
            chunk.getMetadata().put("sessionId", sessionId.toString());
            chunk.getMetadata().put("userId", userId.toString());
            chunk.getMetadata().put("sourceUrl", request.url());
        }

        ragService.addDocuments(chunks);

        String summary = summarizeTranscript(sessionTitle, transcriptText);
        String combined = "YouTube Video: " + request.url() + "\n\n### Lecture Summary\n" + summary + "\n\n### Lecture Transcript\n\n" + transcriptText;
        sessionService.appendContextText(sessionId, combined);

        return new IngestResponse(
                sessionId,
                session.getTitle(),
                chunks.size(),
                summary
        );
    }

    private String extractVideoId(String url) {
        if (url == null) return null;
        Matcher matcher = VIDEO_ID_PATTERN.matcher(url);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String fetchCaptions(String videoId) {
        try {
            HttpRequest pageReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.youtube.com/watch?v=" + videoId))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .GET()
                    .build();

            HttpResponse<String> pageResp = httpClient.send(pageReq, HttpResponse.BodyHandlers.ofString());
            String html = pageResp.body();

            Matcher matcher = CAPTION_URL_PATTERN.matcher(html);
            if (matcher.find()) {
                String captionUrl = matcher.group(1).replace("\\u0026", "&");
                HttpRequest timedTextReq = HttpRequest.newBuilder()
                        .uri(URI.create(captionUrl))
                        .header("User-Agent", "Mozilla/5.0")
                        .GET()
                        .build();

                HttpResponse<String> timedTextResp = httpClient.send(timedTextReq, HttpResponse.BodyHandlers.ofString());
                String xml = timedTextResp.body();

                Document doc = Jsoup.parse(xml, "", org.jsoup.parser.Parser.xmlParser());
                Elements textElements = doc.select("text");
                StringBuilder transcriptBuilder = new StringBuilder();

                for (Element el : textElements) {
                    String startStr = el.attr("start");
                    String text = el.text().trim();
                    if (!text.isEmpty()) {
                        if (!startStr.isEmpty()) {
                            try {
                                double startSeconds = Double.parseDouble(startStr);
                                int totalSec = (int) startSeconds;
                                int min = totalSec / 60;
                                int sec = totalSec % 60;
                                String timestamp = String.format("[%02d:%02d]", min, sec);
                                transcriptBuilder.append(timestamp).append(" ").append(text).append("\n");
                            } catch (Exception ignored) {
                                transcriptBuilder.append(text).append(" ");
                            }
                        } else {
                            transcriptBuilder.append(text).append(" ");
                        }
                    }
                }
                return transcriptBuilder.toString().trim();
            }
        } catch (Exception e) {
            log.warn("Direct caption extraction failed for video {}: {}", videoId, e.getMessage());
        }
        return null;
    }

    private String generateConceptualSummaryFromVideo(String url, String title) {
        try {
            return chatClient.prompt()
                    .system("You are an expert tutor. Provide an in-depth, structured outline and lecture summary of the topics typically covered in this educational resource.")
                    .user("Educational Video URL: " + url + "\nVideo Title: " + title)
                    .call()
                    .content();
        } catch (Exception e) {
            return "Educational video session on " + title + " (" + url + "). Ready for interactive Q&A and active recall drills.";
        }
    }

    private String summarizeTranscript(String title, String content) {
        String truncated = content.length() > 4000 ? content.substring(0, 4000) : content;
        try {
            return chatClient.prompt()
                    .system("Provide a 3-point high level summary of the key learning objectives covered in this lecture/transcript.")
                    .user("Title: " + title + "\n\nContent:\n" + truncated)
                    .call()
                    .content();
        } catch (Exception e) {
            return "Ingested lecture transcript for " + title + ". Concepts indexed for RAG tutoring.";
        }
    }
}
