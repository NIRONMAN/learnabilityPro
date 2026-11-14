'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AgentLogo } from './AgentLogo';
import {
  ThinkingCategory,
  THINKING_CATEGORIES,
  ALL_THINKING_PHRASES,
  CategorizedThinkingPhrase,
} from '@/lib/thinkingWords';

export interface ThinkingIndicatorProps {
  /** Optional restriction to a specific cognitive category */
  category?: ThinkingCategory;
  /** Duration in milliseconds each phrase remains visible (default: 2800ms) */
  intervalMs?: number;
  /** Visual presentation mode */
  mode?: 'inline' | 'card' | 'badge' | 'compact';
  /** Whether to render the custom AgentLogo alongside the indicator */
  showLogo?: boolean;
  /** Size for the AgentLogo when shown */
  logoSize?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to show the category pill badge */
  showCategoryBadge?: boolean;
  /** Optional custom list of phrases to cycle through */
  customPhrases?: string[];
  /** Optional extra CSS classes */
  className?: string;
  /** Callback fired whenever the phrase cycles */
  onPhraseChange?: (phrase: string, category: ThinkingCategory) => void;
}

export function ThinkingIndicator({
  category,
  intervalMs = 2800,
  mode = 'inline',
  showLogo = true,
  logoSize = 'sm',
  showCategoryBadge = true,
  customPhrases,
  className = '',
  onPhraseChange,
}: ThinkingIndicatorProps) {
  // Build active phrase pool
  const pool = useMemo<readonly CategorizedThinkingPhrase[]>(() => {
    if (customPhrases && customPhrases.length > 0) {
      return customPhrases.map((phrase, i) => ({
        id: `custom-${i}`,
        phrase,
        category: category || 'analysis',
      }));
    }
    if (category) {
      return ALL_THINKING_PHRASES.filter((item) => item.category === category);
    }
    return ALL_THINKING_PHRASES;
  }, [category, customPhrases]);

  // Current active phrase index
  const [currentIndex, setCurrentIndex] = useState(0);
  // Transition state: 'entering' | 'visible' | 'exiting'
  const [transitionState, setTransitionState] = useState<'entering' | 'visible' | 'exiting'>('visible');

  // Timer for cycling through phrases with smooth fade in/out
  useEffect(() => {
    if (pool.length <= 1) return;

    const fadeOutDuration = 240; // ms for exit animation
    const cycleInterval = Math.max(intervalMs, 1000);

    const timer = setInterval(() => {
      // Begin fade out
      setTransitionState('exiting');

      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % pool.length;
          const nextItem = pool[next];
          if (nextItem && onPhraseChange) {
            onPhraseChange(nextItem.phrase, nextItem.category);
          }
          return next;
        });

        // Trigger fade in
        setTransitionState('entering');
        // Transition to stable visible state
        requestAnimationFrame(() => {
          setTimeout(() => {
            setTransitionState('visible');
          }, 30);
        });
      }, fadeOutDuration);
    }, cycleInterval);

    return () => clearInterval(timer);
  }, [pool, intervalMs, onPhraseChange]);

  const currentItem = pool[currentIndex] || pool[0] || {
    id: 'fallback',
    phrase: 'Refining reasoning steps...',
    category: 'analysis' as ThinkingCategory,
  };

  const meta = THINKING_CATEGORIES[currentItem.category] || THINKING_CATEGORIES.analysis;

  // Category theme styling helper
  const categoryStyles: Record<
    ThinkingCategory,
    { badgeBg: string; badgeBorder: string; badgeText: string; pulse: string; glow: string }
  > = {
    analysis: {
      badgeBg: 'bg-accent-cyan/10',
      badgeBorder: 'border-accent-cyan/25',
      badgeText: 'text-accent-cyan',
      pulse: 'bg-accent-cyan',
      glow: 'shadow-[0_0_12px_rgba(56,189,248,0.2)]',
    },
    grounding: {
      badgeBg: 'bg-accent-emerald/10',
      badgeBorder: 'border-accent-emerald/25',
      badgeText: 'text-accent-emerald',
      pulse: 'bg-accent-emerald',
      glow: 'shadow-[0_0_12px_rgba(52,211,153,0.2)]',
    },
    synthesis: {
      badgeBg: 'bg-accent-violet/10',
      badgeBorder: 'border-accent-violet/25',
      badgeText: 'text-accent-violet',
      pulse: 'bg-accent-violet',
      glow: 'shadow-[0_0_12px_rgba(167,139,250,0.2)]',
    },
    pedagogy: {
      badgeBg: 'bg-accent-amber/10',
      badgeBorder: 'border-accent-amber/25',
      badgeText: 'text-accent-amber',
      pulse: 'bg-accent-amber',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.2)]',
    },
  };

  const activeTheme = categoryStyles[currentItem.category];

  // CSS classes for smooth transition
  const transitionClasses =
    transitionState === 'visible'
      ? 'opacity-100 translate-y-0 filter-none transition-all duration-300 ease-out'
      : transitionState === 'entering'
      ? 'opacity-0 translate-y-1.5 blur-[1px] transition-all duration-300 ease-out'
      : 'opacity-0 -translate-y-1.5 blur-[1px] transition-all duration-200 ease-in';

  // --- Variant Renderers ---

  // 1. Compact / Minimal Pill
  if (mode === 'compact') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 font-mono text-xs text-ink-muted ${className}`}
      >
        {showLogo && <AgentLogo size={logoSize} animated variant="cyan" />}
        <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.pulse} animate-pulse`} />
        <span className={`truncate text-ink-primary font-medium ${transitionClasses}`}>
          {currentItem.phrase}
        </span>
      </div>
    );
  }

  // 2. Badge Pill (Great for headers and status bars)
  if (mode === 'badge') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${activeTheme.badgeBorder} ${activeTheme.badgeBg} font-mono text-[11px] backdrop-blur-sm ${className}`}
      >
        {showLogo && <AgentLogo size="xs" animated variant="gradient" />}
        <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.pulse} animate-ping`} />
        <span className={`font-semibold ${activeTheme.badgeText} uppercase tracking-wider text-[10px]`}>
          {meta.label}
        </span>
        <span className="text-rule-strong">/</span>
        <span className={`text-ink-primary truncate max-w-xs ${transitionClasses}`}>
          {currentItem.phrase}
        </span>
      </div>
    );
  }

  // 3. Card Container (Ideal for deep reasoning inspect panels or loading overlays)
  if (mode === 'card') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`p-4 rounded-xl border border-rule-border bg-surface/90 backdrop-blur-md ${activeTheme.glow} transition-all duration-500 ${className}`}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-rule-border/60">
          <div className="flex items-center gap-2.5">
            {showLogo && <AgentLogo size={logoSize} animated variant="gradient" />}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-primary">
                  Socratic Reasoning Engine
                </span>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${activeTheme.pulse} animate-pulse`} />
              </div>
              <p className="text-[10px] text-ink-muted font-mono">{meta.tagline}</p>
            </div>
          </div>

          {showCategoryBadge && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${activeTheme.badgeBorder} ${activeTheme.badgeBg} ${activeTheme.badgeText}`}
            >
              {meta.label}
            </span>
          )}
        </div>

        <div className="py-1 min-h-[2.25rem] flex items-center font-mono text-xs text-ink-primary">
          <span className={`text-accent-cyan mr-2 select-none`}>&gt;</span>
          <p className={`italic ${transitionClasses}`}>
            {currentItem.phrase}
          </p>
        </div>
      </div>
    );
  }

  // 4. Default 'inline' mode (Perfect for chat streaming bubbles and message streams)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-rule-border bg-surface/95 backdrop-blur-md shadow-sm transition-all duration-300 ${className}`}
    >
      {showLogo && (
        <div className="shrink-0 p-1 rounded-lg bg-surface-elevated border border-rule-border">
          <AgentLogo size={logoSize} animated variant="gradient" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 font-mono text-xs">
        {showCategoryBadge && (
          <span
            className={`shrink-0 self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-semibold border ${activeTheme.badgeBorder} ${activeTheme.badgeBg} ${activeTheme.badgeText} flex items-center gap-1.5`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.pulse} animate-pulse`} />
            {meta.label}
          </span>
        )}

        <div className="min-w-0 flex-1 overflow-hidden">
          <p className={`truncate text-ink-primary font-medium tracking-tight ${transitionClasses}`}>
            {currentItem.phrase}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ThinkingIndicator;
