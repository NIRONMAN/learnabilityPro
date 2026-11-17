import { describe, it, expect } from 'bun:test';
import {
  THINKING_CATEGORIES,
  THINKING_PHRASES_BY_CATEGORY,
  ALL_THINKING_PHRASES,
  getThinkingPhrases,
  getRandomThinkingPhrase,
  getNextThinkingPhrase,
  getCategoryForPhrase,
} from './thinkingWords';

describe('thinkingWords', () => {
  it('defines the four scholarly cognitive pillars', () => {
    expect(THINKING_CATEGORIES.analysis.label).toBe('Formal Analysis');
    expect(THINKING_CATEGORIES.grounding.label).toBe('Source Grounding');
    expect(THINKING_CATEGORIES.synthesis.label).toBe('Conceptual Synthesis');
    expect(THINKING_CATEGORIES.pedagogy.label).toBe('Socratic Pedagogy');
  });

  it('contains categorized thinking phrases with non-empty strings', () => {
    expect(ALL_THINKING_PHRASES.length).toBeGreaterThan(40);
    ALL_THINKING_PHRASES.forEach((item) => {
      expect(typeof item.phrase).toBe('string');
      expect(item.phrase.length).toBeGreaterThan(0);
      expect(['analysis', 'grounding', 'synthesis', 'pedagogy']).toContain(item.category);
    });
  });

  it('getThinkingPhrases filters by category or returns all', () => {
    const analysisPhrases = getThinkingPhrases('analysis');
    expect(analysisPhrases.length).toBe(THINKING_PHRASES_BY_CATEGORY.analysis.length);

    const allPhrases = getThinkingPhrases();
    expect(allPhrases.length).toBe(ALL_THINKING_PHRASES.length);
  });

  it('getRandomThinkingPhrase returns a valid phrase', () => {
    const phrase = getRandomThinkingPhrase('grounding');
    expect(phrase.category).toBe('grounding');
    expect(phrase.phrase.length).toBeGreaterThan(0);
  });

  it('getNextThinkingPhrase cycles in sequence', () => {
    const first = getNextThinkingPhrase(0);
    expect(first.nextIndex).toBe(1);
  });

  it('getCategoryForPhrase accurately maps phrases to categories', () => {
    const testPhrase = ALL_THINKING_PHRASES[0];
    const category = getCategoryForPhrase(testPhrase.phrase);
    expect(category).toBe(testPhrase.category);
  });
});
