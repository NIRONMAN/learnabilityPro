/**
 * Claude-like reasoning and thinking phrases collection.
 * Categorized into four scholarly cognitive pillars:
 *  - analysis: deconstruction, edge cases, formal proof, logical coherence
 *  - grounding: empirical verification, provenance, primary source anchoring
 *  - synthesis: conceptual unification, mental models, cross-domain schemas
 *  - pedagogy: cognitive scaffolding, Socratic inquiry, intuition framing
 */

export type ThinkingCategory = 'analysis' | 'grounding' | 'synthesis' | 'pedagogy';

export interface ThinkingCategoryMeta {
  id: ThinkingCategory;
  label: string;
  tagline: string;
  color: string; // Tailwind color class or hex token
  accentHex: string;
}

export const THINKING_CATEGORIES: Record<ThinkingCategory, ThinkingCategoryMeta> = {
  analysis: {
    id: 'analysis',
    label: 'Formal Analysis',
    tagline: 'Deconstructing structural assumptions & edge cases',
    color: 'text-accent-cyan',
    accentHex: '#38BDF8',
  },
  grounding: {
    id: 'grounding',
    label: 'Source Grounding',
    tagline: 'Anchoring claims to primary citations & empirical truth',
    color: 'text-accent-emerald',
    accentHex: '#34D399',
  },
  synthesis: {
    id: 'synthesis',
    label: 'Conceptual Synthesis',
    tagline: 'Unifying mental models & distilling core schema',
    color: 'text-accent-violet',
    accentHex: '#A78BFA',
  },
  pedagogy: {
    id: 'pedagogy',
    label: 'Socratic Pedagogy',
    tagline: 'Scaffolding intuition & calibrating cognitive load',
    color: 'text-accent-amber',
    accentHex: '#FBBF24',
  },
};

export const THINKING_PHRASES_BY_CATEGORY: Record<ThinkingCategory, readonly string[]> = {
  analysis: [
    'Deconstructing underlying premises and axioms...',
    'Analyzing structural assumptions and edge cases...',
    'Dissecting formal argumentation flow...',
    'Evaluating consistency of logical operators...',
    'Probing theoretical boundary conditions...',
    'Mapping dependency graph of core concepts...',
    'Assessing cognitive load and complexity bottlenecks...',
    'Untangling semantic ambiguities in terminology...',
    'Examining counterexamples and potential failure modes...',
    'Decomposing problem space into first principles...',
    'Checking deductive validity across intermediate inferences...',
    'Isolating key invariants and state transitions...',
    'Auditing mathematical consistency across steps...',
    'Evaluating asymptotic bounds and scale limitations...',
  ],
  grounding: [
    'Anchoring claims to primary textual evidence...',
    'Verifying citation provenance and source context...',
    'Grounding abstraction in concrete empirical specimens...',
    'Cross-referencing claims against canonical literature...',
    'Establishing epistemological boundary conditions...',
    'Tracing derivative claims back to primary axioms...',
    'Validating mathematical formulations against references...',
    'Calibrating confidence levels against observed data...',
    'Distinguishing explicit source claims from inference...',
    'Checking provenance of cited theorems and definitions...',
    'Corroborating assertions with contextual evidence...',
    'Aligning definitions with authoritative standards...',
    'Filtering ungrounded speculation from core findings...',
  ],
  synthesis: [
    'Synthesizing cross-disciplinary parallels...',
    'Unifying complementary mental models...',
    'Distilling fundamental principles into concise schema...',
    'Bridging abstract theory with practical heuristics...',
    'Constructing a coherent hierarchical conceptual framework...',
    'Harmonizing contrasting analytical viewpoints...',
    'Integrating divergent perspectives into unified taxonomy...',
    'Mapping isomorphic relationships between domains...',
    'Forging coherent narrative through multi-step derivation...',
    'Condensing high-dimensional reasoning into focal insights...',
    'Synthesizing macro architecture with micro mechanics...',
    'Deriving emergent systemic implications...',
    'Weaving conceptual threads into an integrated understanding...',
  ],
  pedagogy: [
    'Scaffolding conceptual progression for optimal retention...',
    'Calibrating cognitive load for deep comprehension...',
    'Formulating intuitive mental analogies...',
    'Designing Socratic inquiry pathways...',
    'Anticipating common conceptual stumbling blocks...',
    'Structuring step-by-step cognitive ladder...',
    'Reframing esoteric notation into accessible intuition...',
    'Highlighting subtle distinctions that prevent misconceptions...',
    'Sequencing ideas from foundational to advanced...',
    'Interleaving active recall prompts with core explanations...',
    'Fostering metacognitive awareness of key inflection points...',
    'Crafting high-fidelity mental anchors...',
    'Clarifying the "why" behind non-intuitive mechanisms...',
  ],
} as const;

export interface CategorizedThinkingPhrase {
  id: string;
  phrase: string;
  category: ThinkingCategory;
}

/**
 * Flat list of all 53 reasoning and thinking phrases with category attribution.
 */
export const ALL_THINKING_PHRASES: readonly CategorizedThinkingPhrase[] = (
  Object.entries(THINKING_PHRASES_BY_CATEGORY) as [ThinkingCategory, readonly string[]][]
).flatMap(([category, phrases]) =>
  phrases.map((phrase, index) => ({
    id: `${category}-${index + 1}`,
    phrase,
    category,
  }))
);

/**
 * Get all phrases for a specific category, or all phrases across all categories.
 */
export function getThinkingPhrases(category?: ThinkingCategory): readonly string[] {
  if (category && THINKING_PHRASES_BY_CATEGORY[category]) {
    return THINKING_PHRASES_BY_CATEGORY[category];
  }
  return ALL_THINKING_PHRASES.map((item) => item.phrase);
}

/**
 * Return a random thinking phrase, optionally constrained to a specific category.
 */
export function getRandomThinkingPhrase(category?: ThinkingCategory): CategorizedThinkingPhrase {
  const pool = category
    ? ALL_THINKING_PHRASES.filter((p) => p.category === category)
    : ALL_THINKING_PHRASES;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Return the next thinking phrase in sequence, cycling back to the start.
 */
export function getNextThinkingPhrase(
  currentIndex: number,
  category?: ThinkingCategory
): { phrase: CategorizedThinkingPhrase; nextIndex: number } {
  const pool = category
    ? ALL_THINKING_PHRASES.filter((p) => p.category === category)
    : ALL_THINKING_PHRASES;
  const nextIndex = (currentIndex + 1) % pool.length;
  return {
    phrase: pool[nextIndex],
    nextIndex,
  };
}

/**
 * Lookup category by exact phrase match.
 */
export function getCategoryForPhrase(phrase: string): ThinkingCategory | undefined {
  const found = ALL_THINKING_PHRASES.find((item) => item.phrase === phrase);
  return found?.category;
}
