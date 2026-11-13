# Design System: Academic Research Studio

<!-- impeccable:design-schema 1 -->

## Platform
web

## World
Academic Research Studio

## Aesthetic Core
A disciplined, high-density academic research workbench engineered for rigorous multi-hour study and scientific synthesis. Inspired by IDEs (VS Code, Linear, Raycast) and scientific research suites (Obsidian, Overleaf), it trades empty marketing fluff for high information density, multi-pane collapsible studios, persistent document hierarchies, split-screen reading/interrogation workbenches, and keyboard-first command palettes (`Cmd+K`).

## Color Palette & Multi-Spectral Cognitive Systems

The studio departs from monotone grey/cyan by assigning unambiguous semantic identity to each color channel across all atmospheres:

- `--accent-cyan`: `#38BDF8` (Precision system telemetry, active selection, key indexing `K`, query tokens)
- `--accent-indigo`: `#818CF8` (Query tensor `Q`, structural linear projections, root architecture)
- `--accent-violet`: `#C084FC` (Attention logits, multi-head tensor transformations, arXiv papers)
- `--accent-emerald`: `#34D399` (Ground-truth provenance, verified proof anchors, high-retention recall)
- `--accent-amber`: `#FBBF24` (Variance normalization scale `√d_k`, active recall intervals, lecture video sync)
- `--accent-rose`: `#FB7185` (Value payload `V`, O(1) complexity bounds, bottleneck flags, PDF documents)
- `--accent-teal`: `#2DD4BF` (Relational tensor attention Head 7, direct object bindings)
- `--accent-fuchsia`: `#F472B6` (Action transduction Head 8, cross-attention mappings)

### Atmosphere Modes:
1. **Obsidian Research Slate (`obsidian`)**: Deep obsidian canvas (`#0A0D14`), slate panes (`#111622`), elevated workbenches (`#182032`) with crisp multi-spectral neon telemetry.
2. **Midnight Aurora (`aurora`)**: Cosmic deep navy backdrop (`#060913`), elevated studio panels (`#131C31`), glowing violet-indigo radiance and high-saturation mathematical accents.
3. **Day Academic Blueprint (`blueprint`)**: Drafting slate backdrop (`#F8FAFC`), crisp white research surface (`#FFFFFF`), high-contrast ink (`#0F172A`) and warm amber/cyan academic highlighters.

## Distinct Interactive Elements Added

1. **Interactive Transformer Attention Heatmap Matrix (Tab 1)**:
   - 8 individual Attention Heads, each rendered in its distinct signature hue (Cyan, Indigo, Violet, Emerald, Amber, Rose, Teal, Fuchsia).
   - Real-time sentence query-to-key attention weight heat bars across the classic Winograd coreference sentence (*"The animal didn't cross the street because it was too tired"*).
   - Interactive token clicking dynamically reveals the learned subspace specialization.

2. **Color-Coded Equation Inspector**:
   - Equation (1) `Attention(Q, K, V) = softmax((QK^T)/√d_k)V` broken down into interactive variable chips.
   - Clicking `Q`, `K`, `V`, `softmax`, or `√d_k` surfaces dimension cards (`[Batch, Seq, 64]`) and mathematical explanations.

3. **Multi-Modal Research Ingestion Desk**:
   - Tabbed source ingestion for PDF Research Papers, arXiv DOIs, and YouTube Video Lectures.
   - Animated 4-phase indexing pipeline (Tokenization → Semantic Chunking → 1536-dim Embedding → Studio Ready).

4. **Stanford CS229 Synchronized Video Clip Player Pill**:
   - Interactive audio commentary playback simulation with timecode scrub [04:12 / 54:00].

5. **Concept Dependency Knowledge Graph (Tab 4)**:
   - Visual DAG network showing architectural prerequisites and grounded comprehension states.

6. **Leitner Active Recall Spaced Repetition Deck (Tab 3)**:
   - 3D interactive flip card with 4-box Leitner intervals and color-coded difficulty scheduling.

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
