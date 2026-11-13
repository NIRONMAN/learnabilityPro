# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary audience**: University students, researchers, and self-directed learners studying complex technical subjects, dense textbooks, research papers, and academic video lectures.
- **Core need**: Transforming passive reading and video watching into deep comprehension, long-term retention, and structured active recall.

## Product Purpose
Learnability Pro is an AI-powered multimodal learning platform designed to accelerate mastery of dense educational content. It bridges raw study materials (PDF documents, YouTube transcripts) with structured cognitive tools—enabling learners to interrogate documents with grounded citations, visualize concept hierarchies, and test themselves through adaptive drills. Success is measured by comprehension depth, retention, and reduced study cycle time.

## Positioning
Unlike generic AI chat interfaces that provide detached text summaries or hallucinate answers, Learnability Pro couples grounded retrieval (RAG with pgvector and verifiable document citations) with dedicated cognitive learning primitives: live interactive Mermaid concept trees, schema-validated flashcards, and active recall drills tied directly to source material.

## Operating Context
- **Study Workflows**: Ingestion of textbooks, slide decks, research PDFs, and lecture videos -> Grounded interrogation in interactive split-screen view -> Mindmap diagram exploration -> Flashcard generation -> Active recall testing.
- **Environment**: Modern web browsers on desktop, laptop, and tablet devices during focused study sessions.
- **Integration**: Backend powered by Java 21 / Spring Boot 3.3+ with Spring AI and Supabase PostgreSQL (pgvector); Next.js 15 client with real-time SSE streaming.

## Capabilities and Constraints
- **Capabilities**:
  - PDF document and YouTube lecture transcription ingestion.
  - Streaming AI tutor chat (`/learn`) with grounded source retrieval and citation verification.
  - Interactive Mermaid concept mindmap generation and exploration (`/diagram`).
  - Structured, strongly-typed flashcard deck generation (`/flashcard`).
  - Adaptive comprehension drills and active recall revision (`/revise`).
  - Persistent user sessions, progress tracking, and document libraries (`/dashboard`).
- **Constraints**:
  - Requires reliable backend connectivity for Spring AI embeddings and vector store queries.
  - Visual mindmaps must conform strictly to valid Mermaid.js syntax.
  - Grounded claims must stay anchored to ingested source documents.

## Brand Commitments
- **Name**: Learnability Pro
- **Tone & Voice**: Rigorous, encouraging, articulate, clear, and intellectually respectful. Free of hollow hype or synthetic cheerleading.
- **Aesthetic Direction**: Focus-centric, clean, modern, high-contrast readability, structured typography, and distraction-free learning environments.

## Evidence on Hand
- Full-stack production codebase: Spring Boot backend ([`backend/`](file:///home/niro/Projects/learnabilityPro/backend)) and Next.js frontend ([`frontend/`](file:///home/niro/Projects/learnabilityPro/frontend)).
- Architectural specification and implementation roadmap in [PLAN.md](file:///home/niro/Projects/learnabilityPro/PLAN.md).
- Working endpoints for authentication, chat streaming, ingestion, flashcards, diagrams, and sessions.

## Product Principles
1. **Grounded Over Generative**: Every explanation, mindmap branch, and flashcard must anchor directly to verified source material with clear provenance.
2. **Active Over Passive**: Prompt the student to test, visualize, and reconstruct understanding rather than passively skimming text.
3. **Cognitive Clarity**: Prioritize typographic hierarchy, visual rhythm, and clean information architecture to minimize extraneous cognitive load during study.
4. **Resilient Feedback Loops**: Immediate, transparent validation of learner responses, syntax rendering, and retrieval sources.

## Accessibility & Inclusion
- Strict compliance with WCAG 2.1 AA standards for contrast ratios, keyboard navigation across study tools, and screen reader announcements for streaming tutor responses and dynamic quiz states.
