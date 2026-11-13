'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Terminal, Search, Layers, BookOpen, UserCheck, ArrowRight, Activity, Command } from 'lucide-react';
import { authStorage } from '@/lib/api';
import { useState, useEffect } from 'react';

export function SanctuaryHeader({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!authStorage.getToken());
  }, [pathname]);

  return (
    <header className="border-b border-rule-border bg-surface/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between text-xs">
        {/* Brand identity: Academic Studio Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 text-ink-primary focus:outline-none">
            <div className="w-7 h-7 rounded-md border border-rule-border bg-surface-elevated flex items-center justify-center font-mono font-bold text-xs text-accent-cyan group-hover:border-accent-cyan transition-all shadow-sm">
              LP
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="font-semibold text-sm text-ink-primary">
                Learnability
              </span>
              <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                Studio
              </span>
            </div>
          </Link>

          <span className="text-rule-strong hidden md:inline">/</span>

          {/* Active Document Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 font-mono text-ink-muted">
            <span className="truncate max-w-[200px] text-ink-primary font-medium">
              vaswani-2017.pdf
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
              98.4% Grounded
            </span>
          </div>
        </div>

        {/* Studio Center: Quick Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rule-border bg-canvas hover:border-rule-strong text-ink-muted hover:text-ink-primary transition-all font-mono text-[11px]"
          title="Press Cmd+K to search"
        >
          <Search className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Search citations, formulas, notes...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-rule-border text-[10px] text-ink-muted flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Right side controls: Telemetry & Scholar Access */}
        <div className="flex items-center gap-2.5 font-sans">
          {/* Atmosphere Mode Switcher */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'obsidian' ? 'Switch to Day Slate' : 'Switch to Obsidian Slate'}
            className="p-1.5 rounded-md border border-rule-border bg-surface-elevated text-ink-muted hover:text-ink-primary hover:border-rule-strong transition-all text-xs"
            aria-label="Toggle Studio Atmosphere"
          >
            {theme === 'obsidian' ? (
              <Moon className="w-3.5 h-3.5 text-accent-cyan" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-accent-amber" />
            )}
          </button>

          {/* Direct Workspace Access */}
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-md text-xs font-semibold font-mono bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-all flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            {hasToken ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Workspace</span>
              </>
            ) : (
              <>
                <span>Enter Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
export { SanctuaryHeader as CanvasHeader };
