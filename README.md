# Learnability Pro

Learnability Pro is an AI-powered multimodal learning platform built with Java 21, Spring Boot 3.3+, Spring AI, Supabase (PostgreSQL + pgvector), and Next.js 15 (React 19, Tailwind CSS, shadcn/ui).

## Features
- **Interactive AI Tutor Chat**: Streaming Q&A with grounded retrieval via Spring AI RAG and vector search.
- **Active Recall & Revision**: Adaptive testing, summaries, and comprehension drills.
- **Structured Flashcard Generation**: Strongly-typed flashcard decks via Spring AI.
- **Visual Mindmap & Diagram Synthesis**: Validated Mermaid.js concept trees and flowcharts.
- **Session & Document History**: Persistent user sessions and document metadata in Supabase PostgreSQL.

## Local Development

You can run both Frontend and Backend together using the configured T3 Code script button or via terminal:

### 1. Split Terminal (tmux - Recommended)
Runs both services in a single terminal divided into two live panes (Spring Boot on top, Next.js on the bottom):
- **Via T3 Code UI:** Click the **`Dev (Split Terminal)`** button in the top/right script toolbar.
- **Via Terminal:**
  ```bash
  ./run-tmux.sh
  # or
  ./run.sh tmux
  ```
  *Mouse scrolling and clicking between panes is enabled by default. Press `Ctrl + C` in either pane or close the window to shut down.*

### 2. Unified Interleaved Terminal
Runs both services concurrently with colored prefixes (`[backend]` in cyan, `[frontend]` in magenta):
- **Via T3 Code UI:** Click **`Dev (Unified)`**
- **Via Terminal:**
  ```bash
  ./run.sh
  ```

See [PLAN.md](PLAN.md) for architecture blueprint and implementation roadmap.
