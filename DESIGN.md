# Design System: Academic Research Studio

<!-- impeccable:design-schema 1 -->

## Platform
web

## World
Academic Research Studio

## Aesthetic Core
A disciplined, high-density academic research workbench engineered for rigorous multi-hour study and scientific synthesis. Inspired by IDEs (VS Code, Linear, Raycast) and scientific research suites (Obsidian, Overleaf), it trades empty marketing fluff for high information density, multi-pane collapsible studios, persistent document hierarchies, split-screen reading/interrogation workbenches, and keyboard-first command palettes (`Cmd+K`).

## Color Palette

### Obsidian Research Slate (Default Focus Studio)
- `--bg-canvas`: `#090D16` (deep obsidian workbench backdrop)
- `--bg-surface`: `#0F172A` (elevated studio pane surface)
- `--bg-surface-elevated`: `#1E293B` (high-contrast active tab & docked panel)
- `--bg-muted`: `#172033` (subtle panel header & inset area)
- `--fg-primary`: `#F8FAFC` (pure diamond white)
- `--fg-body`: `#CBD5E1` (comfortable reading slate)
- `--fg-muted`: `#94A3B8` (precise coordinates, timestamps & annotations)
- `--border-subtle`: `#1E293B` (hairline pane separator)
- `--border-strong`: `#334155` (focused panel border & active split line)
- `--border-focus`: `#38BDF8` (electric cyan precision focus ring)
- `--accent-cyan`: `#0EA5E9` (terminal telemetry & active selection)
- `--accent-indigo`: `#6366F1` (synthesis & Socratic prompt accent)
- `--accent-emerald`: `#10B981` (verified provenance grounding)
- `--accent-amber`: `#F59E0B` (active recall alert & formula variable)
- `--accent-seal`: `#EF4444` (retrieval error & low confidence mark)
- `--highlight-wash`: `rgba(14, 165, 233, 0.14)` (active line & passage wash)

### Day Academic Slate (Daytime Studio)
- `--bg-canvas`: `#F1F5F9` (drafting slate backdrop)
- `--bg-surface`: `#FFFFFF` (crisp white workbench pane)
- `--bg-surface-elevated`: `#F8FAFC` (elevated control panel)
- `--bg-muted`: `#E2E8F0` (pane header & gutter background)
- `--fg-primary`: `#0F172A` (deep carbon ink)
- `--fg-body`: `#334155` (academic reading slate)
- `--fg-muted`: `#64748B` (technical metadata & line numbers)
- `--border-subtle`: `#E2E8F0` (pane divider)
- `--border-strong`: `#CBD5E1` (active pane border)
- `--border-focus`: `#0284C7` (deep cyan focus indicator)
- `--accent-cyan`: `#0284C7` (primary action & telemetry)
- `--accent-indigo`: `#4F46E5` (conceptual query accent)
- `--accent-emerald`: `#059669` (grounded provenance mark)
- `--accent-amber`: `#D97706` (warning/recall amber)
- `--accent-seal`: `#DC2626` (alert crimson)
- `--highlight-wash`: `rgba(2, 132, 199, 0.08)` (subtle text highlight)

## Typography

### Display & Workbench Headers
- **Font**: Precision sans-serif stack (`ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Inter`, `sans-serif`).
- **Scale**:
  - Studio Main Statement: `2.25rem` - `3rem` (`leading-tight`, font-bold, tracking tight)
  - Pane Headers: `0.875rem` - `1rem` (`leading-none`, font-semibold, uppercase tracking-wider)
  - Monograph Headings: `1.25rem` - `1.5rem` (`leading-snug`, font-semibold)
- **Rules**: Strictly NO gradient text. High-contrast typography with clear hierarchy. No kickers or eyebrows above titles.

### Body & Academic Citations
- **Font**: Humanist sans / modern technical typography (`ui-sans-serif`, `system-ui`, `-apple-system`, `sans-serif`).
- **Measure**: Optimized for split-screen multi-pane readability (`55ch` - `68ch`).
- **Data, Code & Coordinates**: Monospace tabular stack (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`) for section numbers (`§3.2`), line numbers, tokens, and mathematical formulations.

## Layout & Multi-Pane Topology

### 1. Persistent Activity Dock & Document Hierarchy
- Persistent left activity dock with document tree, ingestion queues, and index health metrics.
- Collapsible section tree allowing instant navigation through paper headings and figures.

### 2. Split-Screen Active Study Workbench
- **Left Pane (50%)**: Primary research document stream with numbered paragraphs, highlighted citations (`[§3.2]`), and interactive margin annotations.
- **Right Pane (50%)**: Interactive AI interrogation scratchpad with three dedicated studio views:
  1. **Socratic Tutor**: Live streaming discussion with verified citations.
  2. **Active Recall**: High-density flashcard drill with Leitner intervals.
  3. **Concept & Attention Matrix**: Detailed mathematical and structural overview.

### 3. Precision Command Palette (`Cmd+K`)
- Keyboard-first command palette for instant search across documents, formulas, chunk anchors, and AI commands.

## Browser Surfaces & Polish
- **Selection**: `bg-cyan-500/20 text-cyan-200` (or `bg-sky-100 text-sky-900` in light mode).
- **Caret**: Electric cyan `#0EA5E9`.
- **Scrollbar**: Custom thin line (`5px`), slate-toned, zero friction.
- **Focus States**: High-contrast, clean 2px outline with 2px offset.
