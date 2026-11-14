package com.learnabilitypro.learnability.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.io.File;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class YouTubeTranscriptService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeTranscriptService.class);
    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile("(?:v=|/v/|youtu\\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})");
    private static final Pattern CAPTION_URL_PATTERN = Pattern.compile("\"baseUrl\"\\s*:\\s*\"(https://www\\.youtube\\.com/api/timedtext[^\"]+)\"");

    private static final Pattern SRT_PATTERN = Pattern.compile(
            "(\\d+)\\r?\\n(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})\\s*-->\\s*(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})\\r?\\n(.*?)(?=\\n\\n|\\r\\n\\r\\n|\\Z)",
            Pattern.DOTALL
    );

    private static final Pattern VTT_PATTERN = Pattern.compile(
            "(?:(\\d{2}):)?(\\d{2}):(\\d{2})\\.(\\d{3})\\s*-->\\s*(?:(\\d{2}):)?(\\d{2}):(\\d{2})\\.(\\d{3})[^\\n]*\\r?\\n(.*?)(?=\\n\\n|\\r\\n\\r\\n|\\Z)",
            Pattern.DOTALL
    );

    private final HttpClient httpClient;
    private final RagService ragService;
    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final StudySessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

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
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public IngestResponse ingestYouTube(YouTubeIngestRequest request, UUID userId) {
        String videoId = extractVideoId(request.url());
        if (videoId == null) {
            throw new IllegalArgumentException("Invalid YouTube URL: " + request.url());
        }

        // 1. Resolve authentic video title
        String resolvedTitle = fetchVideoTitle(videoId, request.url());
        String sessionTitle = request.title();
        if (sessionTitle == null || sessionTitle.isBlank()
                || sessionTitle.equalsIgnoreCase("YouTube Study Session")
                || sessionTitle.startsWith("YouTube Study: ")) {
            sessionTitle = (resolvedTitle != null && !resolvedTitle.isBlank())
                    ? resolvedTitle
                    : "YouTube Study: " + videoId;
        }

        // 2. Locate or create study session
        StudySession session;
        UUID sessionId = request.sessionId();
        if (sessionId != null) {
            session = sessionService.getSessionEntity(sessionId, userId);
            session.setTitle(sessionTitle);
            session.setSourceUrl(request.url());
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

        // 3. Extract subtitles / transcript with timestamps
        String rawTranscript = fetchCaptions(videoId);
        String transcriptText;
        if (rawTranscript != null && !rawTranscript.isBlank()) {
            transcriptText = rawTranscript;
            log.info("Successfully fetched authentic YouTube transcript for video {} ({} chars)", videoId, transcriptText.length());
        } else {
            log.warn("Could not extract captions for video {}. Generating grounded summary fallback for: {}", videoId, sessionTitle);
            transcriptText = generateConceptualSummaryFromVideo(request.url(), sessionTitle);
        }

        // 4. Index into Vector Store
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

        // 5. Generate concise, grounded pedagogical summary
        String summary = summarizeTranscript(sessionTitle, transcriptText);
        String combined = "YouTube Video: " + request.url() + "\n\n### Lecture Summary\n" + summary + "\n\n### Lecture Transcript\n\n" + transcriptText;
        
        session.setTitle(sessionTitle);
        session.setContextText(combined);
        sessionRepository.save(session);

        return new IngestResponse(
                sessionId,
                session.getTitle(),
                chunks.size(),
                summary
        );
    }

    public String extractVideoId(String url) {
        if (url == null) return null;
        Matcher matcher = VIDEO_ID_PATTERN.matcher(url);
        return matcher.find() ? matcher.group(1) : null;
    }

    public String fetchVideoTitle(String videoId, String rawUrl) {
        // Try YouTube oEmbed API first (official, fast, unauthenticated)
        try {
            String oembedUrl = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=" + videoId + "&format=json";
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(oembedUrl))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200 && resp.body() != null && !resp.body().isBlank()) {
                JsonNode root = objectMapper.readTree(resp.body());
                String title = root.path("title").asText(null);
                if (title != null && !title.isBlank()) {
                    log.info("Fetched YouTube title via oEmbed for {}: {}", videoId, title);
                    return title.trim();
                }
            }
        } catch (Exception e) {
            log.debug("oEmbed title lookup failed for {}: {}", videoId, e.getMessage());
        }

        // Fallback: yt-dlp --print title
        try {
            ProcessBuilder pb = new ProcessBuilder("yt-dlp", "--print", "title", "https://www.youtube.com/watch?v=" + videoId);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            if (finished && process.exitValue() == 0) {
                try (InputStream is = process.getInputStream()) {
                    String title = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
                    if (!title.isBlank()) {
                        log.info("Fetched YouTube title via yt-dlp for {}: {}", videoId, title);
                        return title;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("yt-dlp title lookup failed for {}: {}", videoId, e.getMessage());
        }

        return null;
    }

    public String fetchCaptions(String videoId) {
        // 1. Try yt-dlp first (extracts official or auto-generated subtitles with full reliability)
        String ytdlpTranscript = fetchCaptionsWithYtDlp(videoId);
        if (ytdlpTranscript != null && !ytdlpTranscript.isBlank()) {
            return ytdlpTranscript;
        }

        // 2. Direct timedtext scraping fallback
        return fetchCaptionsDirectTimedText(videoId);
    }

    private String fetchCaptionsWithYtDlp(String videoId) {
        String tempPrefix = "/tmp/learnability-yt-" + videoId + "-" + System.currentTimeMillis();
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "yt-dlp",
                    "--skip-download",
                    "--write-auto-sub",
                    "--write-sub",
                    "--sub-lang", "en.*,en",
                    "--sub-format", "srt",
                    "-o", tempPrefix + ".%(ext)s",
                    "https://www.youtube.com/watch?v=" + videoId
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(20, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("yt-dlp timed out downloading subtitles for {}", videoId);
                return null;
            }

            File tmpDir = new File("/tmp");
            File[] matchingFiles = tmpDir.listFiles((dir, name) ->
                    name.startsWith(new File(tempPrefix).getName()) && (name.endsWith(".srt") || name.endsWith(".vtt")));

            if (matchingFiles == null || matchingFiles.length == 0) {
                log.warn("yt-dlp exited with code {} but no subtitle files generated for {}", process.exitValue(), videoId);
                return null;
            }

            // Prefer English subtitle file
            File selectedFile = matchingFiles[0];
            for (File f : matchingFiles) {
                if (f.getName().contains(".en.") || f.getName().contains(".en-orig.")) {
                    selectedFile = f;
                    break;
                }
            }

            String content = Files.readString(selectedFile.toPath(), StandardCharsets.UTF_8);
            boolean isVtt = selectedFile.getName().endsWith(".vtt");
            String parsed = isVtt ? parseVttToTranscript(content) : parseSrtToTranscript(content);

            // Cleanup
            for (File f : matchingFiles) {
                try {
                    Files.deleteIfExists(f.toPath());
                } catch (Exception ignored) {}
            }

            return parsed;
        } catch (Exception e) {
            log.warn("yt-dlp caption extraction failed for video {}: {}", videoId, e.getMessage());
            return null;
        }
    }

    private String fetchCaptionsDirectTimedText(String videoId) {
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
                if (xml == null || xml.isBlank()) return null;

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
                String result = transcriptBuilder.toString().trim();
                return result.isBlank() ? null : result;
            }
        } catch (Exception e) {
            log.warn("Direct caption extraction failed for video {}: {}", videoId, e.getMessage());
        }
        return null;
    }

    public static String parseSrtToTranscript(String srtContent) {
        if (srtContent == null || srtContent.isBlank()) return null;
        Matcher matcher = SRT_PATTERN.matcher(srtContent);
        record SrtCue(int totalSec, String text) {}
        List<SrtCue> cues = new ArrayList<>();
        while (matcher.find()) {
            int h = Integer.parseInt(matcher.group(2));
            int mn = Integer.parseInt(matcher.group(3));
            int s = Integer.parseInt(matcher.group(4));
            int totalSec = h * 3600 + mn * 60 + s;
            String text = matcher.group(10).replaceAll("\\r?\\n", " ").replaceAll("<[^>]+>", "").trim();
            if (!text.isEmpty()) {
                cues.add(new SrtCue(totalSec, text));
            }
        }
        if (cues.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        Integer currSec = null;
        List<String> currTexts = new ArrayList<>();

        for (SrtCue cue : cues) {
            if (currSec == null) {
                currSec = cue.totalSec();
            }
            currTexts.add(cue.text());
            int elapsed = cue.totalSec() - currSec;
            int textLength = currTexts.stream().mapToInt(String::length).sum();
            if (elapsed >= 12 || textLength > 140) {
                int min = currSec / 60;
                int sec = currSec % 60;
                sb.append(String.format("[%02d:%02d] %s\n", min, sec, String.join(" ", currTexts).trim()));
                currSec = null;
                currTexts.clear();
            }
        }
        if (currSec != null && !currTexts.isEmpty()) {
            int min = currSec / 60;
            int sec = currSec % 60;
            sb.append(String.format("[%02d:%02d] %s\n", min, sec, String.join(" ", currTexts).trim()));
        }

        return sb.toString().trim();
    }

    public static String parseVttToTranscript(String vttContent) {
        if (vttContent == null || vttContent.isBlank()) return null;
        Matcher matcher = VTT_PATTERN.matcher(vttContent);
        record VttCue(int totalSec, String text) {}
        List<VttCue> cues = new ArrayList<>();
        while (matcher.find()) {
            String hStr = matcher.group(1);
            int h = (hStr != null && !hStr.isBlank()) ? Integer.parseInt(hStr) : 0;
            int mn = Integer.parseInt(matcher.group(2));
            int s = Integer.parseInt(matcher.group(3));
            int totalSec = h * 3600 + mn * 60 + s;
            String text = matcher.group(9).replaceAll("\\r?\\n", " ").replaceAll("<[^>]+>", "").trim();
            if (!text.isEmpty()) {
                cues.add(new VttCue(totalSec, text));
            }
        }
        if (cues.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        Integer currSec = null;
        List<String> currTexts = new ArrayList<>();

        for (VttCue cue : cues) {
            if (currSec == null) {
                currSec = cue.totalSec();
            }
            currTexts.add(cue.text());
            int elapsed = cue.totalSec() - currSec;
            int textLength = currTexts.stream().mapToInt(String::length).sum();
            if (elapsed >= 12 || textLength > 140) {
                int min = currSec / 60;
                int sec = currSec % 60;
                sb.append(String.format("[%02d:%02d] %s\n", min, sec, String.join(" ", currTexts).trim()));
                currSec = null;
                currTexts.clear();
            }
        }
        if (currSec != null && !currTexts.isEmpty()) {
            int min = currSec / 60;
            int sec = currSec % 60;
            sb.append(String.format("[%02d:%02d] %s\n", min, sec, String.join(" ", currTexts).trim()));
        }

        return sb.toString().trim();
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
