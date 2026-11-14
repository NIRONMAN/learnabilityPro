package com.learnabilitypro.learnability.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class YouTubeTranscriptServiceTest {

    @Test
    void extractVideoIdMatchesVariousYouTubeUrlFormats() {
        YouTubeTranscriptService service = new YouTubeTranscriptService(null, null, null, null);

        assertThat(service.extractVideoId("https://www.youtube.com/watch?v=qy4ajsBbOKw")).isEqualTo("qy4ajsBbOKw");
        assertThat(service.extractVideoId("https://youtu.be/qy4ajsBbOKw?si=eRWQ0aI9bmbDVsVh")).isEqualTo("qy4ajsBbOKw");
        assertThat(service.extractVideoId("https://www.youtube.com/embed/qy4ajsBbOKw")).isEqualTo("qy4ajsBbOKw");
        assertThat(service.extractVideoId("https://www.youtube.com/shorts/qy4ajsBbOKw")).isEqualTo("qy4ajsBbOKw");
        assertThat(service.extractVideoId("invalid-url")).isNull();
    }

    @Test
    void parseSrtToTranscriptConvertsCuesToCleanTimestampedSegments() {
        String srt = """
                1
                00:00:00,480 --> 00:00:05,440
                Docker Desktop takes this number of

                2
                00:00:02,639 --> 00:00:07,680
                milliseconds to run this tiny container.

                3
                00:00:05,440 --> 00:00:10,400
                Then I found this thing called Ciri that
                """;

        String transcript = YouTubeTranscriptService.parseSrtToTranscript(srt);

        assertThat(transcript).isNotNull();
        assertThat(transcript).contains("[00:00]");
        assertThat(transcript).contains("Docker Desktop takes this number of");
        assertThat(transcript).contains("called Ciri that");
    }

    @Test
    void parseVttToTranscriptConvertsVttCues() {
        String vtt = """
                WEBVTT
                Kind: captions
                Language: en

                00:00:00.480 --> 00:00:03.200
                Welcome back to another deep dive.

                00:00:03.200 --> 00:00:07.500
                Today we are comparing container runtimes.
                """;

        String transcript = YouTubeTranscriptService.parseVttToTranscript(vtt);

        assertThat(transcript).isNotNull();
        assertThat(transcript).contains("[00:00]");
        assertThat(transcript).contains("Welcome back to another deep dive.");
        assertThat(transcript).contains("Today we are comparing container runtimes.");
    }
}
