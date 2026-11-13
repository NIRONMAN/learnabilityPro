# Design System: Monastic Scholar & Tri-Mode Study Studio

<!-- impeccable:design-schema 1 -->

## Platform
web

## World
Monastic Scholar & Tri-Mode Study Studio

## Aesthetic Core
A tranquil, distraction-free cognitive sanctuary engineered for sustained, multi-hour deep comprehension and scientific synthesis. Departing from sensory-overloaded "IDE cockpits" with competing neon telemetry, this system is built on **cognitive ergonomics**, **generous negative space**, **high-contrast typographic hierarchy**, and **progressive disclosure**. 

Tools do not crowd the viewport; instead, they adapt to the learner's active mental state through three dedicated focus modes:
1. **Focus Read**: 100% serene reading canvas (optimal 65–70ch measure) with unobtrusive margin markers and contextual floating actions on text selection.
2. **Interrogate**: A calm 2-column workbench pairing the source text with an articulate, citation-grounded Socratic tutor.
3. **Active Recall**: A full-focus Leitner spaced repetition study deck free from peripheral visual noise.

## Color Palette & Restraint

Rather than spraying 8 competing neon colors across the screen, the palette is strictly disciplined to provide calm clarity:

- `--canvas`: Deep obsidian slate (`#0A0D14`) in dark mode; soft warm drafting slate (`#F8FAFC`) in light mode.
- `--surface`: `#111622` (quiet containers, subtle elevated cards).
- `--surface-elevated`: `#182032` (contextual overlays, command palette, floating pills).
- `--rule-border`: `#1E293B` (ultra-subtle hairline borders with zero visual weight).
- `--ink-primary`: `#F8FAFC` (high-contrast, razor-sharp readable text).
- `--ink-body`: `#CBD5E1` (comfortable, eye-friendly paragraph reading tone).
- `--ink-muted`: `#94A3B8` (quiet metadata, chapter numbers, timestamps).
- `--accent-cyan`: `#38BDF8` (the sole primary focus & active selection accent).
- `--accent-emerald`: `#34D399` (semantic ground-truth provenance & verified citations only).

### Atmosphere Modes:
1. **Obsidian Focus (Default)**: Deep obsidian canvas (`#0A0D14`), matte slate surfaces, crisp bone typography, and sky-cyan precision indicators.
2. **Aurora Nocturne**: Deep cosmic midnight (`#060913`), subtle violet ambient depth, designed for late-night reading.
3. **Parchment Blueprint**: Warm, non-glare daylight paper canvas (`#F8FAFC`), crisp ink typography (`#0F172A`), and amber/slate highlights.

## Progressive Disclosure & Interaction Rules

1. **Selection-Driven Tooling**:
   - Selecting any passage in the reading canvas immediately surfaces a floating action pill (`✦ Socratic Explain`, `Create Flashcard`, `Concept Graph`).
   - The user stays in flow without hunting through complex sidebar trees.

2. **Mode-Driven Viewports**:
   - The learner switches seamlessly between `Read`, `Interrogate`, and `Recall` from the minimal top bar.
   - Peripheral tools (flashcards, chat, graphs) only occupy screen real estate when the user is actively working with them.

3. **Quiet Command Palette (`Cmd+K`)**:
   - All document navigation, chapter jumping, formula lookups, and AI queries are accessible via a clean keyboard-first command palette, eliminating persistent menu clutter.

4. **Streamlined Ingestion Drawer**:
   - Ingestion (PDF, arXiv, YouTube) lives in a clean modal drawer that stays out of sight during study sessions.

## Typography
- **Reading Measure**: Constrained to `65ch` - `70ch` for optimal reading speed and low ocular fatigue.
- **Font Stack**: Clean humanist sans (`Inter`, system UI stack) with tabular monospace for citations (`§3.2`), formulas, and token statistics.
- **Hierarchy**: High contrast between section titles, lead paragraphs, and source footnotes, with zero decorative gradient text.
