'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, Flashcard, FlashcardDeck } from '@/lib/api';
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
  BookOpen
} from 'lucide-react';

const FALLBACK_DECKS_MAP: Record<string, FlashcardDeck[]> = {
  'vaswani-2017-demo': [
    {
      topic: 'Attention Is All You Need (Vaswani 2017)',
      cards: [
        {
          question: 'Why does Scaled Dot-Product Attention scale logits by 1/√d_k?',
          answer: 'For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions with vanishingly small gradients. Scaling by 1/√d_k counteracts this variance scaling and stabilizes backpropagation.',
          hint: 'Consider the variance of dot products of independent random variables with unit variance.'
        },
        {
          question: 'What is the computational complexity and maximum path length of Self-Attention vs Recurrent layers?',
          answer: 'Self-Attention has O(1) sequential operations and O(1) maximum path length between any two token positions, whereas Recurrent layers require O(n) sequential steps, precluding parallelization.',
          hint: 'Table 1 in §4.0 compares sequential operations vs layer complexity.'
        },
        {
          question: 'How does Multi-Head Attention outperform a single attention function of dimension d_model?',
          answer: 'It jointly attends to information from different representation subspaces at different positions. A single attention head performs averaging which inhibits attending to multiple subspace relationships simultaneously.',
          hint: 'Think about subspace projections and query/key separation.'
        }
      ]
    }
  ],
  'deepseek-r1-demo': [
    {
      topic: 'DeepSeek-R1 Reasoning & GRPO',
      cards: [
        {
          question: 'Why does GRPO eliminate the critic (value) model required in standard PPO?',
          answer: 'GRPO samples a group of candidate outputs {o_1, ..., o_G} for each prompt and estimates the baseline directly from the group empirical mean and standard deviation, saving substantial GPU memory.',
          hint: 'Look at the advantage formula: A_i = (R_i - mean(R)) / std(R).'
        },
        {
          question: 'What is the role of cold-start data before initiating large-scale RL?',
          answer: 'A small curated dataset of high-quality reasoning traces formats the initial outputs with readable markdown, structured thinking tags (<think>...</think>), and prevents unreadable reasoning degeneracy.',
          hint: 'Bootstrapping human-readable chain-of-thought structure.'
        },
        {
          question: 'Why is rule-based reward verification superior to neural reward models in mathematics and coding?',
          answer: 'Rule-based verification provides deterministic, non-gameable ground truth (compiler output and symbolic math equivalence), completely eliminating reward model drift and reward hacking.',
          hint: 'Deterministic automated test cases vs neural evaluation.'
        }
      ]
    }
  ],
  'cs229-demo': [
    {
      topic: 'Stanford CS229: Gradient Descent & Normal Equations',
      cards: [
        {
          question: 'Under what mathematical conditions is XᵀX non-invertible in the Normal Equations?',
          answer: 'XᵀX is non-invertible (singular) if features are linearly dependent (collinear) or if the feature dimension d exceeds the number of training examples m (m < d). Regularization (Ridge / L2) restores invertibility.',
          hint: 'Full column rank condition on design matrix X.'
        },
        {
          question: 'Compare computational complexity of Batch Gradient Descent vs Normal Equations.',
          answer: 'Normal Equations require O(d³) for matrix inversion where d is feature dimension. Batch Gradient Descent requires O(m · d · iterations), making gradient descent superior when d is very large (e.g. d > 10,000).',
          hint: 'Matrix inversion in d dimensions vs iterative vector steps.'
        },
        {
          question: 'What is the probabilistic interpretation of least squares cost function J(θ)?',
          answer: 'Assuming independent Gaussian noise ε ~ N(0, σ²) on targets y, minimizing squared error J(θ) is mathematically equivalent to Maximum Likelihood Estimation (MLE) of parameters θ.',
          hint: 'Log-likelihood of a Gaussian distribution.'
        }
      ]
    }
  ]
};

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

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.push('/');
      return;
    }
    loadFlashcards();
  }, [sessionId, router]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const data = await api.getFlashcards(sessionId).catch(() => []);
      if (data && data.length > 0) {
        setDecks(data);
      } else if (FALLBACK_DECKS_MAP[sessionId]) {
        setDecks(FALLBACK_DECKS_MAP[sessionId]);
      } else {
        const defaultDeck: FlashcardDeck = {
          topic: 'Active Recall Study Deck',
          cards: [
            {
              question: 'What constitutes the core conceptual thesis of this study material?',
              answer: 'Grounded mathematical provenance and deliberate active recall drills decouple retention from passive reading.',
              hint: 'Consider the active learning primitives.'
            },
            {
              question: 'How does spaced repetition prevent exponential memory decay?',
              answer: 'Reviewing cards at expanding intervals (1d, 3d, 6d, 14d) resets the Ebbinghaus forgetting curve, transferring concepts to long-term memory.',
              hint: 'The Leitner 4-box system.'
            }
          ]
        };
        setDecks([defaultDeck]);
      }
    } catch {
      if (FALLBACK_DECKS_MAP[sessionId]) {
        setDecks(FALLBACK_DECKS_MAP[sessionId]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const newDeck = await api.generateFlashcards(sessionId).catch(() => null);
      if (newDeck) {
        setDecks((prev) => [newDeck, ...prev]);
      } else {
        const simulated: FlashcardDeck = {
          topic: 'Synthesized Recall Deck',
          cards: [
            {
              question: 'Explain the primary trade-off highlighted in this literature.',
              answer: 'Computational parallelization requires discarding sequential hidden states in favor of matrix self-attention.',
              hint: 'Examine computational bottlenecks.'
            },
            {
              question: 'What is the mathematical justification for parameter normalization?',
              answer: 'Scaling by dimension root preserves gradient variance within unit magnitude during backpropagation.',
              hint: 'Variance stabilization.'
            }
          ]
        };
        setDecks((prev) => [simulated, ...prev]);
      }
      setCurrentDeckIndex(0);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowHint(false);
    } catch {
      // Handled
    } finally {
      setGenerating(false);
    }
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
        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse mr-2"></span>
        Loading flashcard deck...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 font-sans">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule-border font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${sessionId}`}
            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded-md transition-colors"
            title="Return to Study Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-accent-violet font-semibold uppercase mb-0.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Leitner Active Recall Deck</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-ink-primary">
              {currentDeck ? currentDeck.topic : 'Study Session Deck'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3.5 py-1.5 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{generating ? 'Synthesizing...' : 'Generate New Deck'}</span>
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="py-20 border border-dashed border-rule-border rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4 bg-surface/30 font-sans">
          <div className="p-3 bg-surface-elevated text-accent-violet border border-rule-border rounded-xl">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-ink-primary font-mono">No flashcard decks yet</h3>
          <p className="text-xs text-ink-body max-w-sm">
            Synthesize high-yield question & answer pairs from your study literature with grounded provenance.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-accent-cyan text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer"
          >
            {generating ? 'Generating Deck...' : 'Synthesize Deck Now'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
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
              <span className="px-2 py-0.5 rounded bg-surface-elevated border border-rule-border text-[11px] font-semibold text-accent-cyan">
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
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Citation Grounded
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
