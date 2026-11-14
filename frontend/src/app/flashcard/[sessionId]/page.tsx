'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, Flashcard, FlashcardDeck, FlashcardReadiness } from '@/lib/api';
import {
  ArrowLeft,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Network
} from 'lucide-react';

export default function FlashcardPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [currentDeckIndex, setCurrentDeckIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Agent Context Readiness & Custom Topic state
  const [readiness, setReadiness] = useState<FlashcardReadiness | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [inlineContext, setInlineContext] = useState('');

  // Strong Authentication Gate: Non-authenticated users are redirected back to landing page
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.replace('/?auth=login');
      return;
    }
    api.getMe()
      .then(() => {
        loadData();
      })
      .catch(() => {
        authStorage.removeToken();
        router.replace('/?auth=login');
      });
  }, [sessionId, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [decksData, readinessData] = await Promise.all([
        api.getFlashcards(sessionId).catch(() => []),
        api.checkFlashcardReadiness(sessionId).catch(() => null),
      ]);

      if (decksData && decksData.length > 0) {
        setDecks(decksData);
      } else {
        setDecks([]);
      }
      setReadiness(readinessData);
    } catch (err) {
      console.error('Failed to load flashcard session data:', err);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (options?: { force?: boolean; topic?: string; customContext?: string }) => {
    setDeckError(null);
    try {
      setGenerating(true);
      const newDeck = await api.generateFlashcards(sessionId, {
        topic: options?.topic || customPrompt || readiness?.topic,
        force: options?.force,
        customContext: options?.customContext,
      });

      if (newDeck) {
        setDecks((prev) => [newDeck, ...prev]);
        setCurrentDeckIndex(0);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowHint(false);
        setCustomPrompt('');
        setInlineContext('');
      }
    } catch (err: any) {
      setDeckError(err.message || 'Failed to synthesize active recall deck from literature.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    handleGenerate({ topic: customPrompt.trim(), force: true });
  };

  const handleInlineContextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineContext.trim()) return;
    handleGenerate({
      topic: readiness?.topic,
      customContext: inlineContext.trim(),
      force: true,
    });
  };

  const currentDeck = decks[currentDeckIndex];
  const cards: Flashcard[] = currentDeck?.cards || [];
  const currentCard = cards[currentCardIndex];

  const handleNext = useCallback(() => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentCardIndex, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentCardIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleGrade = (box: number) => {
    if (currentCard?.id) {
      api.updateMastery(currentCard.id, box).catch(() => {});
    }
    if (box >= 3) {
      setMasteredCount((m) => m + 1);
    }
    setIsFlipped(false);
    setShowHint(false);
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-muted text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-accent-violet animate-pulse mr-2"></span>
        Evaluating study session context & flashcards...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 font-sans">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule-border font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded-md transition-colors"
            title="Exit to Workspace Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-accent-violet font-semibold uppercase mb-0.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Leitner Active Recall Deck</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-ink-primary">
              {currentDeck ? currentDeck.topic : readiness?.topic || 'Study Session Deck'}
            </h1>
          </div>
        </div>

        {/* Unified 3-Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-surface-elevated p-1 rounded-lg border border-rule-border">
            <Link
              href={`/learn/${sessionId}`}
              className="px-3 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
              title="Switch to Socratic Dialogue"
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Socratic Interrogate</span>
            </Link>
            <span className="px-3 py-1 rounded-md text-xs font-semibold bg-canvas text-accent-violet border border-rule-border shadow-sm flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-accent-violet" />
              <span>Active Recall</span>
            </span>
            <Link
              href={`/diagram/${sessionId}`}
              className="px-3 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
              title="Switch to Concept Mindmap"
            >
              <Network className="w-3.5 h-3.5 text-accent-amber" />
              <span>Concept Map</span>
            </Link>
          </div>

          {cards.length > 0 && (
            <button
              onClick={() => handleGenerate({ force: true })}
              disabled={generating}
              className="px-3.5 py-1.5 bg-accent-violet text-white font-bold hover:bg-accent-violet/90 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-violet-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{generating ? 'Synthesizing...' : 'New Deck'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Synthesis Input Form (matches diagram synthesis workflow) */}
      <form onSubmit={handleCustomFormSubmit} className="flex gap-2 font-mono text-xs">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={
            readiness?.topic
              ? `e.g. Focus on ${readiness.topic} foundational theorems, proofs, or edge cases...`
              : 'e.g. Focus on foundational proofs, architectural tradeoffs, or key equations...'
          }
          className="flex-1 px-3.5 py-2 rounded-lg bg-surface border border-rule-border text-ink-primary placeholder:text-ink-subtle text-xs focus:outline-none focus:border-accent-violet"
        />
        <button
          type="submit"
          disabled={generating || !customPrompt.trim()}
          className="px-4 py-2 bg-accent-violet text-white font-bold hover:bg-accent-violet/90 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-violet-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{generating ? 'Synthesizing...' : 'Synthesize Focus'}</span>
        </button>
      </form>

      {/* Error Alert */}
      {deckError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
          <span>{deckError}</span>
          <button
            onClick={() => setDeckError(null)}
            className="text-[11px] underline hover:text-red-300 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {cards.length === 0 ? (
        <div className="space-y-6">
          {readiness && !readiness.hasSufficientContext ? (
            /* Insufficient Context Display - Gives clear explanation and actionable choices */
            <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-amber-500/30 shadow-sm space-y-6 font-sans">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink-primary font-mono">
                      Insufficient Learning Context in this Session
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Context Check
                    </span>
                  </div>
                  <p className="text-xs text-ink-body leading-relaxed">
                    {readiness.reason}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Active recall flashcards test what you have learned from your study chat or literature. Because this session does not yet have enough dialogue or notes, you can choose how to proceed:
                  </p>
                </div>
              </div>

              {/* Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-rule-border">
                {/* Choice 1: Generate General Topic Deck Anyway */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-rule-border flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary font-mono mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent-violet" />
                      <span>Synthesize Topic Deck Anyway</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Generate up to <strong className="text-ink-primary">10 foundational flashcards</strong> on &quot;{readiness.topic || 'the topic'}&quot;. These will cover general subject principles rather than specific chat dialogue.
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerate({ force: true, topic: readiness.topic })}
                    disabled={generating}
                    className="w-full py-2 px-3 bg-accent-violet text-white font-bold rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 hover:bg-accent-violet/90 disabled:opacity-40 transition-colors cursor-pointer shadow-sm shadow-violet-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generating ? 'Synthesizing...' : 'Generate Deck (Capped at 10)'}</span>
                  </button>
                </div>

                {/* Choice 2: Return to Study Chat */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-rule-border flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary font-mono mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>Chat More to Build Context</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Return to the Socratic tutor workspace. Ask questions, explore concepts, and solve problems so the agent can craft tailored questions on what you actually learned.
                    </p>
                  </div>
                  <Link
                    href={`/learn/${sessionId}`}
                    className="w-full py-2 px-3 bg-surface hover:bg-canvas border border-rule-border text-ink-primary font-semibold rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Return to Socratic Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Choice 3: Provide Custom Context or Notes Inline */}
              <div className="pt-2 border-t border-rule-border space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary font-mono">
                  <Lightbulb className="w-3.5 h-3.5 text-accent-amber" />
                  <span>Or Provide Context / Notes to Synthesize From</span>
                </div>
                <form onSubmit={handleInlineContextSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inlineContext}
                    onChange={(e) => setInlineContext(e.target.value)}
                    placeholder="Enter specific notes, key points, or concepts you want tested..."
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-rule-border text-ink-primary placeholder:text-ink-subtle text-xs focus:outline-none focus:border-accent-violet font-mono"
                  />
                  <button
                    type="submit"
                    disabled={generating || !inlineContext.trim()}
                    className="px-4 py-2 bg-surface hover:bg-canvas border border-rule-border text-ink-primary disabled:opacity-40 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Synthesize with Context</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Sufficient Context Display - Ready to synthesize directly */
            <div className="py-14 border border-dashed border-rule-border rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4 bg-surface/30 font-sans">
              <div className="p-3 bg-surface-elevated text-accent-violet border border-rule-border rounded-xl">
                <Brain className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-ink-primary font-mono">
                  Ready to Synthesize Active Recall Deck
                </h3>
                <p className="text-xs text-ink-body">
                  {readiness?.reason || 'Your study dialogue and literature contain sufficient grounded concepts to generate an active recall deck.'}
                </p>
                {readiness?.keyConcepts && readiness.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                    {readiness.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-[10px] font-mono font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleGenerate()}
                disabled={generating}
                className="px-4 py-2 bg-accent-violet text-white font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer shadow-sm shadow-violet-500/20"
              >
                {generating ? 'Synthesizing Deck...' : 'Synthesize Deck Now'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          {/* Deck Switcher Tabs (if multiple decks exist) */}
          {decks.length > 1 && (
            <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
              {decks.map((deck, idx) => (
                <button
                  key={deck.id || idx}
                  onClick={() => {
                    setCurrentDeckIndex(idx);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                    setShowHint(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    currentDeckIndex === idx
                      ? 'border-accent-violet bg-accent-violet/10 text-accent-violet font-bold'
                      : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {deck.topic} ({deck.cards.length})
                </button>
              ))}
            </div>
          )}

          {/* Progress Indicator */}
          <div className="w-full flex items-center justify-between text-xs font-mono text-ink-muted px-2">
            <span>
              Card <span className="font-bold text-ink-primary">{currentCardIndex + 1}</span> of{' '}
              <span className="font-bold text-ink-primary">{cards.length}</span>
            </span>
            <span className="flex items-center gap-1.5 text-accent-emerald font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mastered: {masteredCount}
            </span>
          </div>

          {/* 3D Flashcard Container */}
          <div
            onClick={handleFlip}
            className="w-full min-h-[300px] sm:min-h-[320px] rounded-2xl bg-surface border border-rule-border hover:border-rule-strong cursor-pointer transition-all flex flex-col justify-between p-7 sm:p-9 shadow-lg select-none"
          >
            {/* Header info */}
            <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
              <span className="px-2 py-0.5 rounded bg-surface-elevated border border-rule-border text-[11px] font-semibold text-accent-violet">
                {isFlipped ? 'Answer & Grounded Verification' : 'Question Prompt'}
              </span>
              <span className="text-[11px] text-ink-subtle">
                Press Space or click to {isFlipped ? 'hide' : 'reveal'}
              </span>
            </div>

            {/* Main content */}
            <div className="my-auto py-6">
              <p className="text-base sm:text-xl font-medium text-ink-primary leading-relaxed text-center">
                {isFlipped ? currentCard?.answer : currentCard?.question}
              </p>
            </div>

            {/* Bottom info */}
            <div className="pt-4 border-t border-rule-border flex items-center justify-between text-xs font-mono text-ink-muted">
              {currentCard?.hint && !isFlipped ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="inline-flex items-center gap-1 text-accent-cyan hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
              ) : (
                <span className="text-accent-emerald flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active Recall Grounded
                </span>
              )}
              <span className="flex items-center gap-1 text-ink-subtle">
                <RotateCw className="w-3 h-3" /> Flip Card
              </span>
            </div>

            {showHint && currentCard?.hint && !isFlipped && (
              <div className="mt-3 p-3 bg-surface-elevated border border-rule-border rounded-lg text-ink-body text-xs text-center font-sans">
                💡 {currentCard.hint}
              </div>
            )}
          </div>

          {/* Leitner Grading Buttons (Visible when flipped) */}
          {isFlipped ? (
            <div className="w-full flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => handleGrade(1)}
                className="flex-1 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-center cursor-pointer transition-colors"
              >
                Again (1d)
              </button>
              <button
                onClick={() => handleGrade(2)}
                className="flex-1 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-center cursor-pointer transition-colors"
              >
                Hard (3d)
              </button>
              <button
                onClick={() => handleGrade(3)}
                className="flex-1 py-2.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-center cursor-pointer transition-colors font-semibold"
              >
                Good (6d)
              </button>
              <button
                onClick={() => handleGrade(4)}
                className="flex-1 py-2.5 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20 text-center cursor-pointer transition-colors font-semibold"
              >
                Easy (14d)
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between text-xs font-mono text-ink-muted">
              <button
                onClick={handlePrev}
                disabled={currentCardIndex === 0}
                className="px-3 py-1.5 rounded-lg border border-rule-border hover:bg-surface-elevated text-ink-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="text-[11px] text-ink-subtle">Use Left / Right arrow keys</span>
              <button
                onClick={handleNext}
                disabled={currentCardIndex === cards.length - 1}
                className="px-3 py-1.5 rounded-lg border border-rule-border hover:bg-surface-elevated text-ink-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
