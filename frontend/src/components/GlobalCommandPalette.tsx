'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  Search,
  BookOpen,
  MessageSquare,
  Network,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  FolderOpen,
  Home,
  X
} from 'lucide-react';

export function GlobalCommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpen);
    };
  }, []);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setSearch('');
    router.push(path);
  };

  const selectTheme = (t: 'obsidian' | 'aurora' | 'blueprint') => {
    setTheme(t);
    setIsOpen(false);
    setSearch('');
  };

  const q = search.toLowerCase();

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 font-mono text-xs animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-rule-border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-rule-border bg-surface-elevated">
          <Search className="w-4 h-4 text-accent-cyan" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands, sanctuaries, formulas, themes..."
            className="flex-1 bg-transparent text-ink-primary focus:outline-none placeholder:text-ink-subtle font-mono text-xs"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule-border text-[10px] text-ink-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          {/* Navigation Section */}
          <div className="text-[10px] uppercase text-ink-muted px-2 py-1 font-semibold">
            Navigation & Workspaces
          </div>

          {(q === '' || q.includes('home') || q.includes('studio') || q.includes('land')) && (
            <button
              onClick={() => navigateTo('/')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Home Studio Sanctuary</span>
              </div>
              <span className="text-[10px] text-ink-subtle font-mono">/</span>
            </button>
          )}

          {(q === '' || q.includes('dash') || q.includes('sanc') || q.includes('work')) && (
            <button
              onClick={() => navigateTo('/dashboard')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Study Sanctuaries Dashboard</span>
              </div>
              <span className="text-[10px] text-ink-subtle font-mono">/dashboard</span>
            </button>
          )}

          {/* Core Literature Section */}
          <div className="text-[10px] uppercase text-ink-muted px-2 pt-2 py-1 font-semibold border-t border-rule-border mt-1">
            Research Literature
          </div>

          {(q === '' || q.includes('vaswani') || q.includes('att') || q.includes('trans')) && (
            <button
              onClick={() => navigateTo('/#live-studio')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Attention Is All You Need (Vaswani 2017)</span>
              </div>
              <span className="text-[10px] text-accent-cyan">PDF</span>
            </button>
          )}

          {(q === '' || q.includes('deepseek') || q.includes('r1') || q.includes('grpo')) && (
            <button
              onClick={() => navigateTo('/#live-studio')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent-emerald" />
                <span>DeepSeek-R1: Reasoning via RL (2025)</span>
              </div>
              <span className="text-[10px] text-accent-emerald">arXiv</span>
            </button>
          )}

          {(q === '' || q.includes('cs229') || q.includes('ng') || q.includes('grad')) && (
            <button
              onClick={() => navigateTo('/#live-studio')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-accent-amber" />
                <span>Stanford CS229: ML Foundations (Ng)</span>
              </div>
              <span className="text-[10px] text-accent-amber">Lectures</span>
            </button>
          )}

          {/* Atmosphere Modes */}
          <div className="text-[10px] uppercase text-ink-muted px-2 pt-2 py-1 font-semibold border-t border-rule-border mt-1">
            Studio Atmosphere
          </div>

          {(q === '' || q.includes('obsidian') || q.includes('dark')) && (
            <button
              onClick={() => selectTheme('obsidian')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Obsidian (Default Dark Focus)</span>
              </div>
              {theme === 'obsidian' && <span className="text-[10px] text-accent-cyan">Active</span>}
            </button>
          )}

          {(q === '' || q.includes('aurora') || q.includes('night')) && (
            <button
              onClick={() => selectTheme('aurora')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent-violet" />
                <span>Aurora Nocturne (Cosmic Midnight)</span>
              </div>
              {theme === 'aurora' && <span className="text-[10px] text-accent-violet">Active</span>}
            </button>
          )}

          {(q === '' || q.includes('blueprint') || q.includes('light') || q.includes('paper')) && (
            <button
              onClick={() => selectTheme('blueprint')}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-accent-amber" />
                <span>Blueprint Parchment (Warm Daylight)</span>
              </div>
              {theme === 'blueprint' && <span className="text-[10px] text-accent-amber">Active</span>}
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-rule-border bg-surface-elevated/40 text-[10px] text-ink-muted flex items-center justify-between">
          <span>Navigate with ↑ ↓ and Enter</span>
          <span>Learnability Pro Monastic Studio</span>
        </div>
      </div>
    </div>
  );
}
