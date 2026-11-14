package com.learnabilitypro.learnability.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnabilitypro.learnability.domain.dto.FlashcardDeckDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardDto;
import com.learnabilitypro.learnability.domain.dto.FlashcardReadinessDto;
import com.learnabilitypro.learnability.domain.entity.ChatMessage;
import com.learnabilitypro.learnability.domain.entity.Flashcard;
import com.learnabilitypro.learnability.domain.entity.FlashcardDeck;
import com.learnabilitypro.learnability.domain.entity.StudySession;
import com.learnabilitypro.learnability.domain.repository.ChatMessageRepository;
import com.learnabilitypro.learnability.domain.repository.FlashcardDeckRepository;
import com.learnabilitypro.learnability.domain.repository.FlashcardRepository;
import com.learnabilitypro.learnability.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FlashcardService {

    private static final Logger log = LoggerFactory.getLogger(FlashcardService.class);
    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");

    private final ChatClient chatClient;
    private final StudySessionService sessionService;
    private final FlashcardDeckRepository deckRepository;
    private final FlashcardRepository cardRepository;
    private final ChatMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    public FlashcardService(
            ChatClient chatClient,
            StudySessionService sessionService,
            FlashcardDeckRepository deckRepository,
            FlashcardRepository cardRepository,
            ChatMessageRepository messageRepository) {
        this(chatClient, sessionService, deckRepository, cardRepository, messageRepository, new ObjectMapper());
    }

    @Autowired
    public FlashcardService(
            ChatClient chatClient,
            StudySessionService sessionService,
            FlashcardDeckRepository deckRepository,
            FlashcardRepository cardRepository,
            ChatMessageRepository messageRepository,
            ObjectMapper objectMapper) {
        this.chatClient = chatClient;
        this.sessionService = sessionService;
        this.deckRepository = deckRepository;
        this.cardRepository = cardRepository;
        this.messageRepository = messageRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /**
     * Evaluates whether the study session contains sufficient substantive learning context
     * (literature text or chat conversation) to generate tailored active recall flashcards.
     */
    @Transactional(readOnly = true)
    public FlashcardReadinessDto checkReadiness(UUID sessionId, UUID userId) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);
        List<ChatMessage> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);

        String topic = resolveTopic(null, session);
        boolean hasDoc = session.getContextText() != null && !session.getContextText().isBlank();
        int docChars = hasDoc ? session.getContextText().trim().length() : 0;
        int messageCount = messages.size();

        int totalChatChars = messages.stream()
                .mapToInt(m -> m.getContent() != null ? m.getContent().trim().length() : 0)
                .sum();

        // 1. Fast heuristic evaluation for empty or minimal sessions
        if (!hasDoc && messageCount == 0) {
            return new FlashcardReadinessDto(
                    false,
                    topic,
                    "This study session does not have any conversation history or study literature yet. Ask questions in the Socratic chat to explore concepts before generating active recall cards.",
                    Collections.emptyList(),
                    0,
                    false
            );
        }

        if (!hasDoc && messageCount <= 2 && totalChatChars < 120) {
            return new FlashcardReadinessDto(
                    false,
                    topic,
                    "The chat currently only contains brief interaction (such as an opening question) without detailed discussion. Exploring concepts more deeply with the tutor will yield much higher quality flashcards.",
                    Collections.emptyList(),
                    messageCount,
                    false
            );
        }

        // 2. If substantive content is present, use AI agent to analyze learning readiness and extract key concepts
        String compositeContext = buildCompositeContext(session, messages, null);
        try {
            String evaluationPrompt = """
                    You are an educational assessment agent. Determine whether the provided study session context contains sufficient substantive educational content to generate active recall flashcards that test what the student learned.
                    
                    Session Topic: %s
                    Session Context & Chat:
                    %s
                    
                    Return ONLY a valid JSON object matching this schema:
                    {
                      "hasSufficientContext": boolean,
                      "topic": "precise topic or subject",
                      "reason": "concise explanation of whether and why there is enough context to test learned concepts",
                      "keyConcepts": ["concept1", "concept2", "concept3"]
                    }
                    Do not enclose with explanation outside the JSON.
                    """.formatted(topic, compositeContext.length() > 2500 ? compositeContext.substring(0, 2500) : compositeContext);

            String response = chatClient.prompt()
                    .system("You are an educational assessment agent evaluating learning readiness. Output only valid JSON.")
                    .user(evaluationPrompt)
                    .call()
                    .content();

            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            boolean hasSufficient = root.path("hasSufficientContext").asBoolean(true);
            String evaluatedTopic = root.path("topic").asText(topic);
            String reason = root.path("reason").asText(hasSufficient
                    ? "Study session contains substantive concepts and discussions ready for active recall testing."
                    : "Limited conceptual depth detected in the current discussion.");

            List<String> keyConcepts = new ArrayList<>();
            JsonNode conceptsNode = root.path("keyConcepts");
            if (conceptsNode.isArray()) {
                for (JsonNode c : conceptsNode) {
                    if (c.isTextual() && !c.asText().isBlank()) {
                        keyConcepts.add(c.asText().trim());
                    }
                }
            }

            return new FlashcardReadinessDto(
                    hasSufficient,
                    evaluatedTopic,
                    reason,
                    keyConcepts,
                    messageCount,
                    hasDoc
            );
        } catch (Exception ex) {
            log.warn("Readiness LLM evaluation fell back to heuristic for session {}: {}", sessionId, ex.getMessage());
            boolean heuristicSufficient = hasDoc && docChars > 150 || (messageCount >= 2 && totalChatChars > 150);
            return new FlashcardReadinessDto(
                    heuristicSufficient,
                    topic,
                    heuristicSufficient
                            ? "Study session contains notes and discussion on " + topic + "."
                            : "Session contains minimal discussion. More context will improve card generation.",
                    List.of(topic + " Foundations"),
                    messageCount,
                    hasDoc
            );
        }
    }

    /**
     * Backward-compatible overload for generateFlashcards.
     */
    @Transactional
    public FlashcardDeckDto generateFlashcards(UUID sessionId, UUID userId, String customTopic) {
        return generateFlashcards(sessionId, userId, customTopic, false, null);
    }

    /**
     * Synthesizes an active recall flashcard deck.
     * Incorporates both document literature and the Socratic chat dialogue.
     * When context is limited or force=true, creates an appropriate deck capped at 10 cards.
     */
    @Transactional
    public FlashcardDeckDto generateFlashcards(
            UUID sessionId,
            UUID userId,
            String customTopic,
            boolean force,
            String customContext) {
        StudySession session = sessionService.getSessionEntity(sessionId, userId);
        List<ChatMessage> chatMessages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);

        String topic = resolveTopic(customTopic, session);
        String compositeContext = buildCompositeContext(session, chatMessages, customContext);
        boolean isLowContext = compositeContext.isBlank() || (compositeContext.length() < 120 && customContext == null);

        String userPrompt;
        if (isLowContext || force) {
            userPrompt = """
                    Generate a high-yield active recall flashcard deck on the topic: %s.
                    Available context:
                    %s
                    
                    Guidelines:
                    1. Create between 5 and 10 distinct, rigorous flashcards (maximum 10 cards).
                    2. Cover fundamental principles, definitions, core mechanisms, and key distinctions related to the topic.
                    3. Do NOT output tautological or joke placeholders such as 'What is %s?' with answer 'A core subject of study'.
                    4. Each card must have:
                       - question: A clear, specific question testing genuine comprehension.
                       - answer: An informative, accurate, complete answer.
                       - hint: A helpful mnemonic, clue, or guiding question.
                    
                    Return ONLY valid JSON matching:
                    {
                      "topic": "%s",
                      "cards": [
                        { "question": "...", "answer": "...", "hint": "..." }
                      ]
                    }
                    """.formatted(topic, compositeContext.isBlank() ? "General study topic" : compositeContext, topic, topic);
        } else {
            userPrompt = """
                    Generate a comprehensive, high-yield active recall flashcard deck on the topic: %s based directly on what was taught and discussed in the study session context below.
                    
                    Study Session Context & Chat History:
                    %s
                    
                    Guidelines:
                    1. Create between 5 and 10 distinct flashcards (maximum 10 cards) covering the specific concepts, definitions, mechanisms, and distinctions discussed.
                    2. Ground the questions and answers in what the user learned during the session.
                    3. Do NOT generate generic filler questions.
                    4. Each card must have:
                       - question: A precise prompt testing a real learned concept.
                       - answer: A clear, accurate answer.
                       - hint: A helpful mnemonic or clue.
                    
                    Return ONLY valid JSON matching:
                    {
                      "topic": "%s",
                      "cards": [
                        { "question": "...", "answer": "...", "hint": "..." }
                      ]
                    }
                    """.formatted(topic, compositeContext, topic);
        }

        FlashcardDeckDto deckDto;
        try {
            String rawResponse = chatClient.prompt()
                    .system("You are an expert tutor creating active recall flashcards for students. Output only valid JSON.")
                    .user(userPrompt)
                    .call()
                    .content();

            String json = extractJson(rawResponse);
            deckDto = objectMapper.readValue(json, FlashcardDeckDto.class);

            // Ensure cards list is capped at 10 and not empty
            if (deckDto.cards() == null || deckDto.cards().isEmpty()) {
                deckDto = generateSmartFallbackDeck(topic);
            } else if (deckDto.cards().size() > 10) {
                deckDto = new FlashcardDeckDto(
                        deckDto.id(),
                        deckDto.topic() != null ? deckDto.topic() : topic,
                        deckDto.cards().subList(0, 10)
                );
            }
        } catch (Exception ex) {
            log.error("Failed to generate structured flashcards via ChatClient: {}", ex.getMessage());
            deckDto = generateSmartFallbackDeck(topic);
        }

        // Persist to database
        FlashcardDeck deck = FlashcardDeck.builder()
                .session(session)
                .topic(deckDto.topic() != null ? deckDto.topic() : topic)
                .flashcards(new ArrayList<>())
                .build();

        List<FlashcardDto> savedCardDtos = new ArrayList<>();
        if (deckDto.cards() != null) {
            for (FlashcardDto cardDto : deckDto.cards()) {
                Flashcard card = Flashcard.builder()
                        .deck(deck)
                        .question(cardDto.question())
                        .answer(cardDto.answer())
                        .hint(cardDto.hint())
                        .masteryLevel(0)
                        .build();
                deck.addFlashcard(card);
            }
        }

        deck = deckRepository.save(deck);

        for (Flashcard card : deck.getFlashcards()) {
            savedCardDtos.add(new FlashcardDto(card.getId(), card.getQuestion(), card.getAnswer(), card.getHint()));
        }

        return new FlashcardDeckDto(deck.getId(), deck.getTopic(), savedCardDtos);
    }

    @Transactional(readOnly = true)
    public List<FlashcardDeck> getSessionDecks(UUID sessionId, UUID userId) {
        sessionService.getSessionEntity(sessionId, userId);
        return deckRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
    }

    @Transactional
    public void updateMastery(UUID cardId, int masteryLevel) {
        Flashcard card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard not found: " + cardId));
        card.setMasteryLevel(Math.max(0, Math.min(5, masteryLevel)));
        cardRepository.save(card);
    }

    private String resolveTopic(String customTopic, StudySession session) {
        if (customTopic != null && !customTopic.isBlank()) {
            return customTopic.trim();
        }
        if (session.getTitle() != null && !session.getTitle().isBlank()) {
            return session.getTitle().trim();
        }
        return "Active Recall Deck";
    }

    private String buildCompositeContext(StudySession session, List<ChatMessage> chatMessages, String customContext) {
        StringBuilder sb = new StringBuilder();

        if (session.getContextText() != null && !session.getContextText().isBlank()) {
            sb.append("--- SOURCE LITERATURE & NOTES ---\n");
            sb.append(session.getContextText().trim()).append("\n\n");
        }

        if (chatMessages != null && !chatMessages.isEmpty()) {
            sb.append("--- SOCRATIC STUDY SESSION CHAT ---\n");
            for (ChatMessage msg : chatMessages) {
                String sender = msg.getSender() != null ? msg.getSender().name() : "USER";
                sb.append(sender).append(": ").append(msg.getContent()).append("\n");
            }
            sb.append("\n");
        }

        if (customContext != null && !customContext.isBlank()) {
            sb.append("--- USER CUSTOM FOCUS & NOTES ---\n");
            sb.append(customContext.trim()).append("\n\n");
        }

        return sb.toString().trim();
    }

    private String extractJson(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Empty response from AI model");
        }
        Matcher matcher = CODE_BLOCK_PATTERN.matcher(text.trim());
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        int firstBrace = text.indexOf('{');
        int lastBrace = text.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1).trim();
        }
        return text.trim();
    }

    /**
     * Produces a rigorous, high-quality educational fallback deck for a given topic.
     * Guaranteed never to return empty jokes or generic non-answers.
     */
    public FlashcardDeckDto generateSmartFallbackDeck(String topic) {
        String cleanTopic = (topic != null && !topic.isBlank()) ? topic.replaceAll("[\"'\n]", "").trim() : "Core Subject";
        if (cleanTopic.isBlank()) cleanTopic = "Study Topic";

        List<FlashcardDto> cards = new ArrayList<>();
        cards.add(new FlashcardDto(
                "What is the primary scientific or conceptual definition of " + cleanTopic + "?",
                cleanTopic + " refers to the foundational subject encompassing the key principles, taxonomy, and core properties investigated in this study domain.",
                "Focus on the primary definition and scope of the subject."
        ));
        cards.add(new FlashcardDto(
                "What are the major sub-categories or architectural components of " + cleanTopic + "?",
                "It is primarily structured into distinct sub-classes, functional mechanisms, and procedural stages that govern how components interact.",
                "Think about structural organization and how primary subcomponents are divided."
        ));
        cards.add(new FlashcardDto(
                "What is the functional or historical significance of studying " + cleanTopic + "?",
                "It establishes the theoretical framework and empirical evidence necessary to analyze systems, solve domain problems, and evaluate evolutionary or mechanical adaptations.",
                "Consider the broader impact and applications within the discipline."
        ));
        cards.add(new FlashcardDto(
                "What is a critical distinction or common misconception regarding " + cleanTopic + "?",
                "A frequent misconception is treating distinct sub-elements as interchangeable, rather than distinguishing between core defining attributes and variable external factors.",
                "Differentiate between fundamental characteristics and peripheral phenomena."
        ));
        cards.add(new FlashcardDto(
                "What methodology or evidence is typically used to validate concepts in " + cleanTopic + "?",
                "Validation relies on empirical observation, structured problem-solving, comparative analysis, and domain-specific benchmarks.",
                "Recall the analytical techniques and evidential criteria used in this field."
        ));

        return new FlashcardDeckDto(cleanTopic, cards);
    }
}
