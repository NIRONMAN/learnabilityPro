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
  Plus
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
      const data = await api.getFlashcards(sessionId);
      setDecks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const newDeck = await api.generateFlashcards(sessionId);
      setDecks((prev) => [newDeck, ...prev]);
      setCurrentDeckIndex(0);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowHint(false);
    } catch (err: any) {
      alert(err.message || 'Failed to generate flashcards');
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
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading flashcard deck...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${sessionId}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Active Recall Flashcards</h1>
            <p className="text-xs text-slate-400">
              {currentDeck ? currentDeck.topic : 'Study Session Deck'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {generating ? 'Synthesizing...' : 'Generate New Deck'}
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="py-20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="p-3 bg-purple-950/60 text-purple-400 border border-purple-800/40 rounded-xl">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No flashcard decks yet</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Use Spring AI BeanOutputConverter to synthesize high-yield question & answer pairs from your study material.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
          >
            {generating ? 'Generating Deck...' : 'Synthesize Deck Now'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          {/* Progress Indicator */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 px-2">
            <span>
              Card <span className="font-bold text-white">{currentCardIndex + 1}</span> of{' '}
              <span className="font-bold text-white">{cards.length}</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mastered: {masteredCount}
            </span>
          </div>

          {/* 3D Flashcard Container */}
          <div
            onClick={handleFlip}
            className="w-full h-80 perspective-1000 cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full duration-500 transform-style-3d transition-transform rounded-3xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Card Front (Question) */}
              <div className="absolute inset-0 backface-hidden bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col justify-between shadow-2xl hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between text-xs text-purple-400 font-bold uppercase tracking-wider">
                  <span>Question</span>
                  <span className="text-slate-500 font-normal">Click or Space to flip</span>
                </div>

                <div className="my-auto text-center px-4">
                  <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    {currentCard?.question}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  {currentCard?.hint ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      {showHint ? 'Hide Hint' : 'Show Hint'}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <RotateCw className="w-3 h-3" /> Flip for Answer
                  </span>
                </div>

                {showHint && currentCard?.hint && (
                  <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-indigo-200 text-xs text-center animate-fade-in">
                    💡 Hint: {currentCard.hint}
                  </div>
                )}
              </div>

              {/* Card Back (Answer) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900/95 border border-purple-800/60 p-8 rounded-3xl flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  <span>Answer</span>
                  <span className="text-slate-500 font-normal">Click or Space to return</span>
                </div>

                <div className="my-auto text-center px-4">
                  <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium">
                    {currentCard?.answer}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Review Again
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMasteredCount((c) => c + 1);
                      handleNext();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Mastered
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentCardIndex === 0}
              className="p-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              title="Previous (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleFlip}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4 text-purple-400" />
              Flip Card
            </button>
            <button
              onClick={handleNext}
              disabled={currentCardIndex === cards.length - 1}
              className="p-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              title="Next (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
