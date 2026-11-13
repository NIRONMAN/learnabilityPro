'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import {
  FileText,
  Layers,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  X,
  MessageSquare,
  Command,
  Database,
  Share2,
  Play,
  Activity,
  Maximize2,
  Columns,
  Cpu,
  Hash,
  Check,
  AlertCircle,
  HelpCircle,
  Terminal,
  FolderGit2,
  Sliders,
  Compass,
  Zap
} from 'lucide-react';

interface DocumentSection {
  id: string;
  number: string;
  title: string;
  page: number;
  highlightCount: number;
}

const DOCUMENT_SECTIONS: DocumentSection[] = [
  { id: 'sec-1', number: '1.0', title: 'Introduction & Sequence Modeling', page: 1, highlightCount: 2 },
  { id: 'sec-2', number: '2.0', title: 'Background: Sequential Computation Bottlenecks', page: 2, highlightCount: 1 },
  { id: 'sec-3-1', number: '3.1', title: 'Encoder and Decoder Architecture', page: 3, highlightCount: 3 },
  { id: 'sec-3-2', number: '3.2', title: 'Multi-Head Attention Mechanism', page: 4, highlightCount: 6 },
  { id: 'sec-3-3', number: '3.3', title: 'Position-Wise Feed-Forward Networks', page: 5, highlightCount: 2 },
  { id: 'sec-3-5', number: '3.5', title: 'Positional Encodings & Frequency Sinusoids', page: 6, highlightCount: 4 },
  { id: 'sec-4', number: '4.0', title: 'Computational Complexity: O(1) Path Length', page: 7, highlightCount: 3 },
  { id: 'sec-5', number: '5.0', title: 'Training Regime, Warmup & Optimizer', page: 9, highlightCount: 1 }
];

export default function AcademicStudioPage() {
  const router = useRouter();

  // Studio Layout State
  const [layoutMode, setLayoutMode] = useState<'split' | 'doc-focus' | 'ai-focus'>('split');
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-3-2');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workbenchTab, setWorkbenchTab] = useState<'tutor' | 'flashcards' | 'matrix'>('tutor');

  // Command Palette State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Active Recall State
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardFeedback, setCardFeedback] = useState<string | null>(null);

  // Socratic Interrogation State
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorConversation, setTutorConversation] = useState<Array<{ sender: 'scholar' | 'tutor'; text: string; citation?: string }>>([
    {
      sender: 'scholar',
      text: 'Explain why scaled dot-product attention scales by 1/√d_k rather than standard dot-product attention.'
    },
    {
      sender: 'tutor',
      text: 'In high dimensions (e.g. d_k = 64), the magnitude of the dot products grows substantially, pushing the softmax function into regions where gradients approach zero (saturation). Dividing by √d_k normalizes the variance to 1.0, preserving effective gradient flow during training.',
      citation: 'Vaswani et al. (2017), Section 3.2.1, Equation 1'
    }
  ]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Ingestion Simulator State
  const [ingestInput, setIngestInput] = useState('Attention-Is-All-You-Need_Vaswani-2017.pdf');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);

  // Auth State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Keyboard shortcut listener for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  // Flashcard Rating
  const handleCardRating = (rating: string) => {
    setCardFeedback(rating);
    setTimeout(() => {
      setCardFeedback(null);
      setCardFlipped(false);
    }, 1600);
  };

  // Socratic Prompt Submission
  const handleAskTutor = (promptText?: string) => {
    const q = promptText || tutorQuery;
    if (!q.trim()) return;

    setTutorConversation((prev) => [...prev, { sender: 'scholar', text: q }]);
    setTutorQuery('');
    setIsAnswering(true);

    setTimeout(() => {
      let reply = 'Multi-head attention projects queries, keys, and values h times with learned projections. This allows the model to simultaneously attend to information from different representation subspaces at different positions.';
      let cite = 'Vaswani et al. (2017), Section 3.2.2';

      if (q.toLowerCase().includes('position')) {
        reply = 'Positional encodings provide sequence order without recurrence. Sine and cosine functions of geometric frequencies allow the model to easily learn relative positions, since PE_(pos+k) is a linear transformation of PE_pos.';
        cite = 'Vaswani et al. (2017), Section 3.5';
      } else if (q.toLowerCase().includes('complexity') || q.toLowerCase().includes('o(1)')) {
        reply = 'A self-attention layer connects all positions with a constant number of sequentially executed operations (O(1) path length), whereas recurrent layers require O(n) sequential operations.';
        cite = 'Vaswani et al. (2017), Table 1 & Section 4';
      }

      setTutorConversation((prev) => [
        ...prev,
        { sender: 'tutor', text: reply, citation: cite }
      ]);
      setIsAnswering(false);
    }, 550);
  };

  // Ingestion Simulator
  const handleStartIngest = () => {
    if (isIngesting) return;
    setIsIngesting(true);
    setIngestStep(1);

    setTimeout(() => setIngestStep(2), 600);
    setTimeout(() => setIngestStep(3), 1300);
    setTimeout(() => setIngestStep(4), 2000);
    setTimeout(() => {
      setIsIngesting(false);
      setIngestStep(0);
    }, 2800);
  };

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      let res;
      if (authMode === 'register') {
        res = await api.register({ email, password, name });
      } else {
        res = await api.login({ email, password });
      }
      authStorage.setToken(res.token);
      setAuthModalOpen(false);
      router.push('/dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 1-Click Instant Guest Scholar
  const handleDemoScholarPass = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.login({ email: 'student@learnability.pro', password: 'password123' });
      authStorage.setToken(res.token);
      router.push('/dashboard');
    } catch {
      authStorage.setToken('scholar_demo_token_valid');
      router.push('/dashboard');
    } finally {
      setAuthLoading(false);
    }
  };

  const filteredSections = DOCUMENT_SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(commandSearch.toLowerCase()) ||
      s.number.includes(commandSearch)
  );

  return (
    <div className="flex-1 flex flex-col bg-canvas text-ink-body font-sans text-xs sm:text-sm select-text">
      {/* 1. Academic Studio Command & Telemetry Strip */}
      <section className="border-b border-rule-border bg-surface px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-accent-cyan">
              <Terminal className="w-3.5 h-3.5" />
              <span>ACADEMIC RESEARCH WORKBENCH · VERSION 3.2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-ink-primary tracking-tight font-sans">
              Disciplined research workbench for complex literature
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-ink-muted max-w-2xl leading-relaxed">
              Engineered for rigorous multi-hour study. Split-screen active reading, persistent document hierarchies, verified mathematical provenance, and keyboard-first AI interrogation.
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDemoScholarPass}
              disabled={authLoading}
              className="px-4 py-2 rounded-md font-mono text-xs font-semibold bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-sm shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{authLoading ? 'Authorizing...' : '1-Click Scholar Pass'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            <button
              onClick={() => {
                setAuthMode('signin');
                setAuthModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-md font-mono text-xs font-medium border border-rule-border bg-surface-elevated text-ink-primary hover:border-rule-strong transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* 2. Main Studio 3-Pane Workbench */}
      <section className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Studio Viewport Layout Switcher & Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border border-rule-border bg-surface text-xs font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="px-2 py-1 rounded border border-rule-border bg-surface-elevated text-ink-muted hover:text-ink-primary hover:border-rule-strong transition-colors flex items-center gap-1.5"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{sidebarCollapsed ? 'Show Navigator' : 'Hide Navigator'}</span>
            </button>

            <div className="h-4 w-px bg-rule-border hidden sm:block"></div>

            <div className="hidden sm:flex items-center gap-2 text-ink-muted">
              <span>Index: 4,812 tokens</span>
              <span>·</span>
              <span>16 Chunks</span>
              <span>·</span>
              <span className="text-accent-emerald flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                98.4% Grounded
              </span>
            </div>
          </div>

          {/* Pane View Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-muted hidden md:inline mr-1">Layout:</span>
            <button
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'split'
                  ? 'bg-accent-cyan text-white font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface-elevated border border-rule-border'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split 50/50</span>
            </button>

            <button
              onClick={() => setLayoutMode('doc-focus')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'doc-focus'
                  ? 'bg-accent-cyan text-white font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface-elevated border border-rule-border'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Focus</span>
            </button>

            <button
              onClick={() => setLayoutMode('ai-focus')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'ai-focus'
                  ? 'bg-accent-cyan text-white font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface-elevated border border-rule-border'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Interrogation</span>
            </button>
          </div>
        </div>

        {/* The 3-Pane Workbench Grid */}
        <div className="grid grid-cols-12 gap-4 min-h-[620px]">
          {/* Pane 1: Left Document Hierarchy & Ingestion Tree (col 12 -> 3) */}
          {!sidebarCollapsed && (
            <div className="col-span-12 lg:col-span-3 rounded-xl border border-rule-border bg-surface p-3.5 flex flex-col justify-between shadow-sm font-mono text-xs">
              <div>
                {/* Active Document Header */}
                <div className="pb-3 border-b border-rule-border">
                  <div className="flex items-center justify-between text-ink-primary font-semibold text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent-cyan" />
                      DOCUMENTS
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                      3 LOADED
                    </span>
                  </div>

                  {/* Document Selector Pills */}
                  <div className="mt-2 space-y-1">
                    <div className="p-2 rounded bg-surface-elevated border border-accent-cyan/40 text-ink-primary flex items-center justify-between cursor-pointer">
                      <span className="truncate max-w-[140px] font-medium">vaswani-2017.pdf</span>
                      <span className="text-[10px] text-accent-emerald font-semibold">ACTIVE</span>
                    </div>
                    <div className="p-2 rounded bg-canvas border border-rule-border text-ink-muted hover:text-ink-primary flex items-center justify-between cursor-pointer">
                      <span className="truncate max-w-[140px]">deepseek-r1.pdf</span>
                      <span className="text-[10px]">24 chunks</span>
                    </div>
                    <div className="p-2 rounded bg-canvas border border-rule-border text-ink-muted hover:text-ink-primary flex items-center justify-between cursor-pointer">
                      <span className="truncate max-w-[140px]">cs229-kernels.mp4</span>
                      <span className="text-[10px]">42 chunks</span>
                    </div>
                  </div>
                </div>

                {/* Document Section Tree */}
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2 flex items-center justify-between">
                    <span>SECTION HIERARCHY</span>
                    <kbd className="px-1 py-0.5 rounded bg-surface-elevated text-[9px] border border-rule-border">⌘K</kbd>
                  </div>

                  <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                    {DOCUMENT_SECTIONS.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => setActiveSectionId(sec.id)}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between ${
                          activeSectionId === sec.id
                            ? 'bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-medium'
                            : 'hover:bg-surface-elevated text-ink-muted hover:text-ink-primary'
                        }`}
                      >
                        <span className="truncate max-w-[160px]">
                          <strong className="font-semibold mr-1">{sec.number}</strong>
                          {sec.title}
                        </span>
                        <span className="text-[10px] text-ink-subtle">p.{sec.page}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ingestion Dropzone & Health */}
              <div className="pt-3 border-t border-rule-border mt-3 text-[11px]">
                <div className="flex items-center justify-between text-ink-muted mb-1.5">
                  <span>Ingestion Engine</span>
                  <span className="text-accent-emerald">READY</span>
                </div>
                <button
                  onClick={handleStartIngest}
                  disabled={isIngesting}
                  className="w-full py-1.5 px-2 rounded border border-dashed border-rule-border hover:border-accent-cyan bg-canvas text-center text-ink-muted hover:text-ink-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-accent-cyan" />
                  <span>{isIngesting ? 'Ingesting...' : 'Ingest New PDF / URL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Pane 2: Center Primary Research Document Stream */}
          <div
            className={`${
              sidebarCollapsed
                ? layoutMode === 'split'
                  ? 'col-span-12 lg:col-span-6'
                  : layoutMode === 'doc-focus'
                  ? 'col-span-12'
                  : 'hidden'
                : layoutMode === 'split'
                ? 'col-span-12 lg:col-span-5'
                : layoutMode === 'doc-focus'
                ? 'col-span-12 lg:col-span-9'
                : 'hidden'
            } rounded-xl border border-rule-border bg-surface flex flex-col shadow-sm overflow-hidden`}
          >
            {/* Document Header Bar */}
            <div className="px-4 py-2.5 border-b border-rule-border bg-surface-elevated flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-primary">Attention Is All You Need</span>
                <span className="text-ink-muted hidden sm:inline">· Vaswani et al. (2017)</span>
              </div>
              <div className="flex items-center gap-2 text-ink-muted text-[11px]">
                <span>Page 4 / 15</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-rule-border text-accent-cyan font-semibold">
                  §3.2 ACTIVE
                </span>
              </div>
            </div>

            {/* Document Content with Academic Line Numbers */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed font-sans text-ink-body">
              {/* Section 3.2 Heading */}
              <div className="pb-2 border-b border-rule-border">
                <h3 className="font-bold text-base sm:text-lg text-ink-primary tracking-tight">
                  3.2 Attention Mechanisms in Sequence Transduction
                </h3>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                  Section 3.2 · Mathematical Definition & Multi-Head Projections
                </p>
              </div>

              {/* Academic Paragraph 1 */}
              <div className="flex gap-3 group">
                <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                  01
                </span>
                <div className="flex-1">
                  An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.
                </div>
              </div>

              {/* Formula Block 1 */}
              <div className="p-3.5 rounded-lg bg-canvas border border-rule-border font-mono text-xs text-ink-primary">
                <div className="flex items-center justify-between text-[10px] text-ink-muted uppercase pb-1.5 mb-2 border-b border-rule-border">
                  <span>Equation (1) · Scaled Dot-Product Attention</span>
                  <span className="text-accent-emerald font-semibold">Verified Anchor</span>
                </div>
                <div className="text-sm font-semibold text-accent-cyan overflow-x-auto py-1">
                  Attention(Q, K, V) = softmax( (Q K^T) / √d_k ) V
                </div>
                <div className="mt-2 text-[11px] text-ink-muted leading-normal">
                  Where queries and keys are of dimension <code className="text-accent-indigo">d_k</code>, and values of dimension <code className="text-accent-indigo">d_v</code>.
                </div>
              </div>

              {/* Academic Paragraph 2 with Grounded Marginalia */}
              <div className="flex gap-3 group">
                <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                  02
                </span>
                <div className="flex-1">
                  We compute the dot products of the query with all keys, divide each by <span className="font-mono text-accent-cyan font-semibold">√d_k</span>, and apply a softmax function to obtain the weights on the values. We suspect that for large values of <span className="font-mono">d_k</span>, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients.
                  <button
                    onClick={() => setWorkbenchTab('tutor')}
                    className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/30 text-[10px] font-mono font-medium"
                    title="Click to interrogate this formula in AI Workbench"
                  >
                    [§3.2.1 Interrogate]
                  </button>
                </div>
              </div>

              {/* Multi-Head Attention Section */}
              <div className="pt-2 border-t border-rule-border">
                <div className="flex gap-3 group">
                  <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                    03
                  </span>
                  <div className="flex-1">
                    <strong className="text-ink-primary font-semibold block mb-1">
                      3.2.2 Multi-Head Attention Subspaces
                    </strong>
                    Instead of performing a single attention function with <span className="font-mono">d_model</span>-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values <span className="font-mono font-semibold">h</span> times with different, learned linear projections.
                    <button
                      onClick={() => setWorkbenchTab('flashcards')}
                      className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20 border border-accent-emerald/30 text-[10px] font-mono font-medium"
                      title="Test recall on Multi-Head Attention"
                    >
                      [§3.2.2 Recall Card]
                    </button>
                  </div>
                </div>
              </div>

              {/* Formula Block 2 */}
              <div className="p-3.5 rounded-lg bg-canvas border border-rule-border font-mono text-xs text-ink-primary">
                <div className="flex items-center justify-between text-[10px] text-ink-muted uppercase pb-1.5 mb-2 border-b border-rule-border">
                  <span>Equation (2) · Multi-Head Projection</span>
                  <span className="text-accent-indigo font-semibold">h = 8 heads, d_k = 64</span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-accent-indigo overflow-x-auto py-1">
                  MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O
                </div>
                <div className="mt-1 text-[11px] text-ink-muted">
                  Where <code className="text-accent-cyan">head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)</code>
                </div>
              </div>
            </div>
          </div>

          {/* Pane 3: Right Interactive AI Interrogation & Scratchpad Workbench */}
          <div
            className={`${
              sidebarCollapsed
                ? layoutMode === 'split'
                  ? 'col-span-12 lg:col-span-6'
                  : layoutMode === 'ai-focus'
                  ? 'col-span-12'
                  : 'hidden'
                : layoutMode === 'split'
                ? 'col-span-12 lg:col-span-4'
                : layoutMode === 'ai-focus'
                ? 'col-span-12 lg:col-span-9'
                : 'hidden'
            } rounded-xl border border-rule-border bg-surface flex flex-col shadow-sm overflow-hidden`}
          >
            {/* Workbench Tab Navigation Bar */}
            <div className="px-3 py-2 border-b border-rule-border bg-surface-elevated flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWorkbenchTab('tutor')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'tutor'
                      ? 'bg-accent-cyan text-white font-semibold'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Socratic Tutor</span>
                </button>

                <button
                  onClick={() => setWorkbenchTab('flashcards')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'flashcards'
                      ? 'bg-accent-emerald text-white font-semibold'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Active Recall</span>
                </button>

                <button
                  onClick={() => setWorkbenchTab('matrix')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'matrix'
                      ? 'bg-accent-indigo text-white font-semibold'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Matrix</span>
                </button>
              </div>

              <span className="text-[10px] text-accent-emerald font-semibold hidden sm:inline">
                LIVE ANCHOR
              </span>
            </div>

            {/* Studio Workbench Body */}
            <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              {/* Tab 1: Socratic AI Interrogation Stream */}
              {workbenchTab === 'tutor' && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted pb-2 border-b border-rule-border">
                      <span>GROUNDED SOCRATIC INTERROGATION</span>
                      <span className="text-accent-cyan">Strict RAG Anchor</span>
                    </div>

                    {/* Pre-populated Prompt Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleAskTutor('Why divide by √d_k in scaled dot-product?')}
                        className="px-2 py-1 rounded bg-canvas border border-rule-border hover:border-accent-cyan text-[11px] text-ink-muted hover:text-ink-primary transition-colors text-left"
                      >
                        Why scale by √d_k?
                      </button>
                      <button
                        onClick={() => handleAskTutor('What is the computational complexity comparison O(1) vs O(n)?')}
                        className="px-2 py-1 rounded bg-canvas border border-rule-border hover:border-accent-cyan text-[11px] text-ink-muted hover:text-ink-primary transition-colors text-left"
                      >
                        O(1) vs O(n) Path Length
                      </button>
                      <button
                        onClick={() => handleAskTutor('How do positional encodings allow relative attention?')}
                        className="px-2 py-1 rounded bg-canvas border border-rule-border hover:border-accent-cyan text-[11px] text-ink-muted hover:text-ink-primary transition-colors text-left"
                      >
                        Positional Encodings
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {tutorConversation.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            msg.sender === 'scholar'
                              ? 'bg-surface-elevated border border-rule-border text-ink-primary font-medium'
                              : 'bg-canvas border border-rule-border text-ink-body'
                          }`}
                        >
                          <div className="font-mono text-[10px] text-ink-muted uppercase mb-1 flex items-center justify-between">
                            <span>{msg.sender === 'scholar' ? 'You (Scholar)' : 'AI Socratic Interrogator'}</span>
                            {msg.citation && <span className="text-accent-cyan font-medium">Anchored</span>}
                          </div>
                          {msg.text}
                          {msg.citation && (
                            <div className="mt-2 pt-1.5 border-t border-rule-border text-[10px] font-mono text-accent-cyan flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{msg.citation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {isAnswering && (
                        <div className="p-3 rounded-lg bg-canvas border border-rule-border text-xs font-mono text-ink-muted animate-pulse">
                          Tracing citations and synthesizing response...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interrogation Query Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskTutor();
                    }}
                    className="pt-2 border-t border-rule-border flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={tutorQuery}
                      onChange={(e) => setTutorQuery(e.target.value)}
                      placeholder="Interrogate formulas, proofs, or intuitions..."
                      className="flex-1 px-3 py-2 rounded-lg border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!tutorQuery.trim() || isAnswering}
                      className="px-3.5 py-2 rounded-lg bg-accent-cyan text-white text-xs font-mono font-medium hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
                    >
                      Probe
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: High-Density Active Recall Matrix */}
              {workbenchTab === 'flashcards' && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted pb-2 border-b border-rule-border">
                      <span>SPACED RETRIEVAL DRILL · BOX 2</span>
                      <span className="text-accent-emerald font-semibold">94% Retention</span>
                    </div>

                    {/* High-Density Recall Card */}
                    <div
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className="mt-3 p-4 rounded-xl border border-rule-border bg-canvas cursor-pointer hover:border-rule-strong transition-all shadow-sm min-h-[160px] flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan block mb-1">
                          {cardFlipped ? 'Answer & Derivation' : 'Question / Active Recall'}
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-ink-primary leading-snug">
                          {cardFlipped
                            ? 'Dot products grow large in dimension d_k, pushing softmax into flat saturated regions where gradients approach zero. 1/√d_k normalizes variance to 1.0.'
                            : 'Why do dot products need to be scaled by 1/√d_k in multi-head attention mechanisms?'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-rule-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
                        <span>Citation: Vaswani et al. §3.2.1</span>
                        <span className="text-accent-cyan flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          {cardFlipped ? 'Click to show question' : 'Click to flip'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Controls */}
                  <div className="pt-3 border-t border-rule-border">
                    {cardFeedback ? (
                      <div className="text-center py-1 text-xs font-mono text-accent-emerald flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Graded &ldquo;{cardFeedback}&rdquo; · Updated Leitner Interval</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <button
                          onClick={() => handleCardRating('Hard')}
                          className="flex-1 py-1.5 rounded border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-red-400 hover:border-red-400 transition-colors"
                        >
                          Hard (1d)
                        </button>
                        <button
                          onClick={() => handleCardRating('Good')}
                          className="flex-1 py-1.5 rounded border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-accent-cyan hover:border-accent-cyan transition-colors"
                        >
                          Good (3d)
                        </button>
                        <button
                          onClick={() => handleCardRating('Easy')}
                          className="flex-1 py-1.5 rounded border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-accent-emerald hover:border-accent-emerald transition-colors"
                        >
                          Easy (7d)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Attention & Architecture Matrix */}
              {workbenchTab === 'matrix' && (
                <div className="flex-1 flex flex-col space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-rule-border">
                    <span>ATTENTION PARAMETER MATRIX</span>
                    <span className="text-accent-cyan">d_model = 512</span>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas border border-rule-border space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Attention Heads (h)</span>
                      <span className="text-ink-primary font-semibold">8 heads</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Query/Key Dim (d_k)</span>
                      <span className="text-ink-primary font-semibold">64 (512 / 8)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Value Dim (d_v)</span>
                      <span className="text-ink-primary font-semibold">64 (512 / 8)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Feed-Forward Dim (d_ff)</span>
                      <span className="text-ink-primary font-semibold">2048</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Layer Normalization</span>
                      <span className="text-accent-emerald font-semibold">Post-LN + Residual</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <span className="text-accent-indigo font-semibold block mb-1">
                      Computational Complexity Comparison:
                    </span>
                    Self-Attention achieves <strong className="text-accent-emerald">O(1)</strong> sequential operations versus <strong className="text-red-400">O(n)</strong> for Recurrent networks, enabling massive parallelization during gradient updates.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Ingestion Pipeline Desk Below Workbench */}
        <div className="p-4 sm:p-5 rounded-xl border border-rule-border bg-surface text-xs font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rule-border">
            <div>
              <span className="font-semibold text-ink-primary text-sm font-sans">
                Research Ingestion & Semantic Chunking Engine
              </span>
              <p className="text-ink-muted text-[11px] font-sans mt-0.5">
                Ingest PDF papers, YouTube lectures, or arXiv IDs into verified mathematical knowledge matrices.
              </p>
            </div>
            <span className="text-accent-cyan text-[11px]">Engine: Spring AI + pgvector</span>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              className="flex-1 w-full px-3 py-2 rounded-md border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-mono"
            />
            <button
              onClick={handleStartIngest}
              disabled={isIngesting}
              className="w-full sm:w-auto px-4 py-2 rounded-md text-xs font-semibold bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isIngesting ? 'Ingesting...' : 'Ingest & Index'}</span>
            </button>
          </div>

          {/* 4-Phase Telemetry Pipeline */}
          {isIngesting && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className={`p-2 rounded border ${ingestStep >= 1 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/5' : 'border-rule-border text-ink-muted'}`}>
                1. Text Tokenization
              </div>
              <div className={`p-2 rounded border ${ingestStep >= 2 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/5' : 'border-rule-border text-ink-muted'}`}>
                2. Semantic Chunking
              </div>
              <div className={`p-2 rounded border ${ingestStep >= 3 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/5' : 'border-rule-border text-ink-muted'}`}>
                3. Vector Embedding
              </div>
              <div className={`p-2 rounded border ${ingestStep >= 4 ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/5' : 'border-rule-border text-ink-muted'}`}>
                4. Studio Ready
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Interactive Keyboard Command Palette (Cmd+K) Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-rule-border bg-surface shadow-2xl overflow-hidden font-mono text-xs">
            {/* Search Input Bar */}
            <div className="px-4 py-3 border-b border-rule-border flex items-center gap-3 bg-surface-elevated">
              <Search className="w-4 h-4 text-accent-cyan" />
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search paper sections, equations, flashcards, or commands..."
                className="flex-1 bg-transparent text-sm text-ink-primary focus:outline-none placeholder:text-ink-muted font-sans"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-rule-border text-[10px] text-ink-muted">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              <div className="text-[10px] uppercase text-ink-muted px-2 py-1 font-semibold">
                PAPER SECTIONS
              </div>
              {filteredSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSectionId(sec.id);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-elevated flex items-center justify-between text-ink-primary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-accent-cyan font-bold">{sec.number}</span>
                    <span>{sec.title}</span>
                  </span>
                  <span className="text-ink-muted text-[10px]">p.{sec.page}</span>
                </button>
              ))}

              <div className="text-[10px] uppercase text-ink-muted px-2 py-1 font-semibold mt-2">
                STUDIO ACTIONS
              </div>
              <button
                onClick={() => {
                  setWorkbenchTab('tutor');
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-elevated flex items-center justify-between text-ink-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Launch Socratic AI Interrogator</span>
                </span>
                <span className="text-ink-muted text-[10px]">Tab 1</span>
              </button>
              <button
                onClick={() => {
                  setWorkbenchTab('flashcards');
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-elevated flex items-center justify-between text-ink-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-accent-emerald" />
                  <span>Start Active Recall Practice Deck</span>
                </span>
                <span className="text-ink-muted text-[10px]">Tab 2</span>
              </button>
            </div>

            {/* Command Palette Footer */}
            <div className="px-4 py-2 bg-canvas border-t border-rule-border text-[10px] text-ink-muted flex items-center justify-between">
              <span>Navigation: ↑ ↓ Enter to select</span>
              <span>Learnability Pro Command Palette</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Authentication Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-rule-border bg-surface shadow-2xl">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close Auth Modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-sans font-bold text-ink-primary tracking-tight">
              {authMode === 'signin' ? 'Sign into Studio Workspace' : 'Create Scholar Account'}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Access persistent research documents, spaced retrieval queues, and Socratic dialogues.
            </p>

            {authError && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3 font-mono">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Scholar Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full px-3 py-2 rounded-lg border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-ink-muted block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@university.edu"
                  className="w-full px-3 py-2 rounded-lg border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-4 py-2.5 rounded-lg text-xs font-semibold bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authLoading ? 'Authorizing...' : authMode === 'signin' ? 'Sign into Studio' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-rule-border flex items-center justify-between text-xs text-ink-muted font-sans">
              <span>
                {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'register' : 'signin');
                  setAuthError(null);
                }}
                className="text-accent-cyan font-medium hover:underline"
              >
                {authMode === 'signin' ? 'Register' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
