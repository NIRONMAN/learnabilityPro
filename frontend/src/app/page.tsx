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
  Pause,
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
  Zap,
  Grid,
  GitBranch,
  Video,
  Bookmark,
  Binary
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
  { id: 'sec-3-5', number: '3.5', title: 'Positional Encodings & Sinusoids', page: 6, highlightCount: 4 },
  { id: 'sec-4', number: '4.0', title: 'Computational Complexity: O(1) Path Length', page: 7, highlightCount: 3 },
  { id: 'sec-5', number: '5.0', title: 'Training Regime, Warmup & Optimizer', page: 9, highlightCount: 1 }
];

interface DocMeta {
  id: 'vaswani' | 'deepseek' | 'cs229';
  title: string;
  type: string;
  authors: string;
  venue: string;
  tokens: string;
  chunks: number;
  groundedScore: number;
}

const DOC_PRESETS: Record<string, DocMeta> = {
  vaswani: {
    id: 'vaswani',
    title: 'Attention Is All You Need',
    type: 'PDF',
    authors: 'Vaswani et al. (Google Brain / Research)',
    venue: 'NeurIPS 2017 · 104,820 Citations',
    tokens: '4,812 tokens',
    chunks: 16,
    groundedScore: 98.4
  },
  deepseek: {
    id: 'deepseek',
    title: 'DeepSeek-R1: Incentivizing Reasoning via RL',
    type: 'arXiv',
    authors: 'DeepSeek-AI Research Team',
    venue: 'arXiv:2501.12948 · Open Weights',
    tokens: '9,420 tokens',
    chunks: 32,
    groundedScore: 99.1
  },
  cs229: {
    id: 'cs229',
    title: 'Stanford CS229: Transformers & Attention Mechanisms',
    type: 'Video',
    authors: 'Prof. Andrew Ng · Stanford Online',
    venue: 'YouTube Video Sync · 54m Lecture',
    tokens: '6,104 tokens',
    chunks: 22,
    groundedScore: 96.8
  }
};

const SENTENCE_TOKENS = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'];

interface AttentionHeadConfig {
  id: number;
  name: string;
  role: string;
  weightsForIt: Record<string, number>;
}

const ATTENTION_HEADS: AttentionHeadConfig[] = [
  {
    id: 1,
    name: 'Head 1',
    role: 'Syntactic Subject Tracking',
    weightsForIt: { The: 0.04, animal: 0.82, "didn't": 0.02, cross: 0.01, the: 0.01, street: 0.02, because: 0.02, it: 0.01, was: 0.08, too: 0.01, tired: 0.06 }
  },
  {
    id: 2,
    name: 'Head 2',
    role: 'Coreference Resolution',
    weightsForIt: { The: 0.01, animal: 0.91, "didn't": 0.01, cross: 0.01, the: 0.01, street: 0.04, because: 0.01, it: 0.01, was: 0.01, too: 0.01, tired: 0.02 }
  },
  {
    id: 3,
    name: 'Head 3',
    role: 'Causal & Explanatory Link',
    weightsForIt: { The: 0.01, animal: 0.15, "didn't": 0.03, cross: 0.02, the: 0.01, street: 0.05, because: 0.45, it: 0.01, was: 0.04, too: 0.08, tired: 0.35 }
  },
  {
    id: 4,
    name: 'Head 4',
    role: 'Local Next-Token Transition',
    weightsForIt: { The: 0.01, animal: 0.02, "didn't": 0.01, cross: 0.01, the: 0.01, street: 0.01, because: 0.02, it: 0.02, was: 0.78, too: 0.14, tired: 0.08 }
  },
  {
    id: 5,
    name: 'Head 5',
    role: 'Predicate Attribute Binding',
    weightsForIt: { The: 0.01, animal: 0.05, "didn't": 0.01, cross: 0.01, the: 0.01, street: 0.02, because: 0.02, it: 0.01, was: 0.03, too: 0.07, tired: 0.88 }
  },
  {
    id: 6,
    name: 'Head 6',
    role: 'Negation & Modal Scope',
    weightsForIt: { The: 0.02, animal: 0.08, "didn't": 0.64, cross: 0.28, the: 0.01, street: 0.02, because: 0.01, it: 0.01, was: 0.02, too: 0.01, tired: 0.03 }
  },
  {
    id: 7,
    name: 'Head 7',
    role: 'Direct Object Relations',
    weightsForIt: { The: 0.01, animal: 0.04, "didn't": 0.02, cross: 0.12, the: 0.02, street: 0.84, because: 0.01, it: 0.01, was: 0.01, too: 0.01, tired: 0.02 }
  },
  {
    id: 8,
    name: 'Head 8',
    role: 'Action & Transduction Root',
    weightsForIt: { The: 0.02, animal: 0.08, "didn't": 0.05, cross: 0.72, the: 0.03, street: 0.20, because: 0.02, it: 0.01, was: 0.02, too: 0.01, tired: 0.04 }
  }
];

interface Flashcard {
  id: string;
  tag: string;
  box: number;
  question: string;
  answer: string;
  citation: string;
  retention: string;
}

const FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    tag: 'SCALED ATTENTION',
    box: 2,
    question: 'Why do dot products grow large in high dimension d_k, requiring scaling by 1/√d_k?',
    answer: 'Assuming independent random variables with zero mean and unit variance, their dot product has variance d_k and standard deviation √d_k. In high dimensions (e.g. d_k = 64), large logits push the softmax function into flat saturated regions where gradients vanish.',
    citation: 'Vaswani et al. §3.2.1, Eq. (1)',
    retention: '94% Recall'
  },
  {
    id: 'fc-2',
    tag: 'SUBSPACE PROJECTION',
    box: 3,
    question: 'What is the structural advantage of Multi-Head Attention over single full-dimensional attention?',
    answer: 'Multi-head attention projects queries, keys, and values h times into learned subspaces of dimension d_k. This allows the model to simultaneously attend to information from different representation subspaces at different positions.',
    citation: 'Vaswani et al. §3.2.2, Eq. (2)',
    retention: '98% Recall'
  },
  {
    id: 'fc-3',
    tag: 'COMPLEXITY COMPARISON',
    box: 1,
    question: 'Compare sequential path length and parallelization between Self-Attention and Recurrent layers.',
    answer: 'Self-attention connects all token positions with O(1) sequential operations, enabling maximum gradient backpropagation speed across sequence length n. Recurrent networks require O(n) sequential steps, creating a serial execution bottleneck.',
    citation: 'Vaswani et al. Section 4, Table 1',
    retention: '87% Recall'
  }
];

export default function AcademicStudioPage() {
  const router = useRouter();

  // Document & Studio State
  const [activeDocId, setActiveDocId] = useState<'vaswani' | 'deepseek' | 'cs229'>('vaswani');
  const [layoutMode, setLayoutMode] = useState<'split' | 'doc-focus' | 'ai-focus'>('split');
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-3-2');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workbenchTab, setWorkbenchTab] = useState<'heatmap' | 'tutor' | 'flashcards' | 'graph'>('heatmap');

  // Interactive Equation Inspector State
  const [activeFormulaVar, setActiveFormulaVar] = useState<'Q' | 'K' | 'dk' | 'softmax' | 'V' | null>('dk');

  // Heatmap State
  const [activeHeadId, setActiveHeadId] = useState<number>(2); // Head 2 Coreference
  const [selectedToken, setSelectedToken] = useState<string>('it');

  // Flashcard Deck State
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardFeedback, setCardFeedback] = useState<string | null>(null);

  // Video / Audio Playback Simulation
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Command Palette State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Socratic Interrogation State
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorConversation, setTutorConversation] = useState<Array<{ sender: 'scholar' | 'tutor'; text: string; citation?: string }>>([
    {
      sender: 'scholar',
      text: 'Explain why scaled dot-product attention scales by 1/√d_k rather than standard dot-product attention.'
    },
    {
      sender: 'tutor',
      text: 'In high dimensions (d_k = 64), the magnitude of the dot products grows substantially, pushing the softmax function into regions where gradients approach zero (saturation). Dividing by √d_k normalizes the variance to 1.0, preserving effective gradient flow during training.',
      citation: 'Vaswani et al. (2017), Section 3.2.1, Equation 1'
    }
  ]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Ingestion Simulator State
  const [ingestMode, setIngestMode] = useState<'pdf' | 'arxiv' | 'youtube'>('pdf');
  const [ingestInput, setIngestInput] = useState('Attention-Is-All-You-Need_Vaswani-2017.pdf');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const activeDoc = DOC_PRESETS[activeDocId];
  const activeHead = ATTENTION_HEADS.find((h) => h.id === activeHeadId) || ATTENTION_HEADS[0];
  const currentCard = FLASHCARDS[cardIndex];

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

  // Flashcard Rating Handler
  const handleCardRating = (rating: string) => {
    setCardFeedback(rating);
    setTimeout(() => {
      setCardFeedback(null);
      setCardFlipped(false);
      setCardIndex((prev) => (prev + 1) % FLASHCARDS.length);
    }, 1100);
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
      {/* 1. Academic Studio Command & Quiet Telemetry Header */}
      <section className="border-b border-rule-border bg-surface px-4 sm:px-6 py-5 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-mono text-[11px] text-ink-muted">
              <span className="font-semibold text-accent-cyan flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                STUDIO WORKBENCH
              </span>
              <span>·</span>
              <span>v3.2</span>
              <span>·</span>
              <span className="text-accent-emerald flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                98.4% Grounded RAG
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight font-sans">
              Disciplined Scientific Research & Synthesis Studio
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted max-w-2xl leading-relaxed">
              Engineered for rigorous multi-hour study. Split-screen reading, transformer attention tensors, verified provenance, and keyboard-first AI interrogation.
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDemoScholarPass}
              disabled={authLoading}
              className="px-4 py-2 rounded-md font-mono text-xs font-semibold bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-sm shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{authLoading ? 'Authorizing...' : '1-Click Scholar Pass'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
        {/* Studio Viewport Layout Switcher & Quiet Document Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border border-rule-border bg-surface text-xs font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="px-2.5 py-1 rounded border border-rule-border bg-surface-elevated text-ink-muted hover:text-ink-primary hover:border-rule-strong transition-colors flex items-center gap-1.5"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{sidebarCollapsed ? 'Show Navigator' : 'Hide Navigator'}</span>
            </button>

            <div className="h-4 w-px bg-rule-border hidden sm:block"></div>

            <div className="hidden sm:flex items-center gap-2 text-ink-muted">
              <span className="font-medium text-ink-primary">{activeDoc.title}</span>
              <span>·</span>
              <span className="text-ink-subtle">{activeDoc.tokens}</span>
              <span>·</span>
              <span>{activeDoc.chunks} chunks</span>
            </div>
          </div>

          {/* Pane View Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-muted hidden md:inline mr-1">Layout:</span>
            <button
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'split'
                  ? 'bg-surface-elevated border border-accent-cyan/40 text-accent-cyan font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface border border-rule-border'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split 50/50</span>
            </button>

            <button
              onClick={() => setLayoutMode('doc-focus')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'doc-focus'
                  ? 'bg-surface-elevated border border-accent-cyan/40 text-accent-cyan font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface border border-rule-border'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Focus</span>
            </button>

            <button
              onClick={() => setLayoutMode('ai-focus')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                layoutMode === 'ai-focus'
                  ? 'bg-surface-elevated border border-accent-cyan/40 text-accent-cyan font-medium'
                  : 'text-ink-muted hover:text-ink-primary bg-surface border border-rule-border'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Workbench</span>
            </button>
          </div>
        </div>

        {/* The 3-Pane Workbench Grid */}
        <div className="grid grid-cols-12 gap-4 min-h-[640px]">
          {/* Pane 1: Left Document Hierarchy & Ingestion Tree (col 12 -> 3) */}
          {!sidebarCollapsed && (
            <div className="col-span-12 lg:col-span-3 rounded-xl border border-rule-border bg-surface p-3.5 flex flex-col justify-between shadow-sm font-mono text-xs">
              <div>
                {/* Active Document Header */}
                <div className="pb-3 border-b border-rule-border">
                  <div className="flex items-center justify-between text-ink-primary font-semibold text-xs mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent-cyan" />
                      RESEARCH CORPUS
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-ink-muted border border-rule-border">
                      3 LOADED
                    </span>
                  </div>

                  {/* Clean Document List */}
                  <div className="space-y-1">
                    <div
                      onClick={() => setActiveDocId('vaswani')}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        activeDocId === 'vaswani'
                          ? 'bg-surface-elevated border-accent-cyan/40 text-ink-primary'
                          : 'bg-canvas border-rule-border text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[150px]">vaswani-2017.pdf</span>
                        <span className="text-[10px] text-accent-emerald font-semibold">ACTIVE</span>
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Attention Is All You Need · 16 chunks</div>
                    </div>

                    <div
                      onClick={() => setActiveDocId('deepseek')}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        activeDocId === 'deepseek'
                          ? 'bg-surface-elevated border-accent-cyan/40 text-ink-primary'
                          : 'bg-canvas border-rule-border text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[150px]">deepseek-r1.pdf</span>
                        <span className="text-[10px] text-ink-subtle">arXiv</span>
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Incentivizing Reasoning · 32 chunks</div>
                    </div>

                    <div
                      onClick={() => setActiveDocId('cs229')}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        activeDocId === 'cs229'
                          ? 'bg-surface-elevated border-accent-cyan/40 text-ink-primary'
                          : 'bg-canvas border-rule-border text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[150px]">cs229-attention.mp4</span>
                        <span className="text-[10px] text-ink-subtle">Video</span>
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Stanford CS229 Sync · 22 chunks</div>
                    </div>
                  </div>
                </div>

                {/* Document Section Tree */}
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2 flex items-center justify-between">
                    <span>SECTIONS & ANCHORS</span>
                    <kbd className="px-1 py-0.5 rounded bg-surface-elevated text-[9px] border border-rule-border">⌘K</kbd>
                  </div>

                  <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                    {DOCUMENT_SECTIONS.map((sec) => {
                      const isSelected = activeSectionId === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => setActiveSectionId(sec.id)}
                          className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-surface-elevated border border-accent-cyan/40 text-accent-cyan font-medium'
                              : 'hover:bg-surface-elevated text-ink-muted hover:text-ink-primary'
                          }`}
                        >
                          <span className="truncate max-w-[170px]">
                            <strong className="font-mono mr-1.5 text-ink-primary">{sec.number}</strong>
                            <span>{sec.title}</span>
                          </span>
                          <span className="text-[10px] text-ink-subtle">p.{sec.page}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Ingestion Engine Status */}
              <div className="pt-3 border-t border-rule-border mt-3 text-[11px]">
                <div className="flex items-center justify-between text-ink-muted mb-1.5">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-accent-cyan" />
                    <span>Vector Index</span>
                  </span>
                  <span className="text-accent-emerald font-semibold">SYNCED</span>
                </div>
                <button
                  onClick={handleStartIngest}
                  disabled={isIngesting}
                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-rule-border hover:border-accent-cyan bg-canvas text-center text-ink-muted hover:text-ink-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-accent-cyan" />
                  <span>{isIngesting ? 'Ingesting...' : 'Ingest New PDF / Video'}</span>
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
                <span className="font-semibold text-ink-primary">{activeDoc.title}</span>
                <span className="text-ink-muted hidden sm:inline">· {activeDoc.authors}</span>
              </div>
              <div className="flex items-center gap-2 text-ink-muted text-[11px]">
                <span>Page 4 / 15</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-rule-border text-accent-cyan font-semibold">
                  §3.2 ACTIVE
                </span>
              </div>
            </div>

            {/* Document Content with Academic Line Numbers & Restrained Formula Inspector */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed font-sans text-ink-body">
              {/* Section 3.2 Heading */}
              <div className="pb-2 border-b border-rule-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-ink-primary tracking-tight">
                    3.2 Attention Mechanisms in Sequence Transduction
                  </h3>
                  <p className="text-xs text-ink-muted font-mono mt-0.5">
                    Section 3.2 · Mathematical Definition & Multi-Head Projections
                  </p>
                </div>
              </div>

              {/* Quiet Audio / Video Synchronization Pill */}
              <div className="p-2.5 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-6 h-6 rounded bg-surface border border-rule-border text-ink-primary flex items-center justify-center hover:border-accent-cyan transition-colors"
                    title={isPlayingAudio ? 'Pause Lecture Sync' : 'Play Lecture Audio Sync'}
                  >
                    {isPlayingAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                  </button>
                  <div>
                    <span className="text-ink-primary font-medium flex items-center gap-1 text-[11px]">
                      <Video className="w-3 h-3 text-accent-cyan" />
                      CS229 Synchronized Commentary [04:12 / 54:00]
                    </span>
                    <span className="text-ink-muted text-[10px]">
                      {isPlayingAudio ? 'Playing: Andrew Ng on dot-product variance normalization...' : 'Audio linked to Section 3.2'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-rule-border text-ink-muted">
                  04:12
                </span>
              </div>

              {/* Academic Paragraph 1 with line number */}
              <div className="flex gap-3 group">
                <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                  01
                </span>
                <div className="flex-1">
                  An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.
                  <span className="ml-1.5 px-1.5 py-0.2 rounded bg-surface-elevated border border-rule-border text-ink-muted text-[10px] font-mono">
                    §3.2 Verified
                  </span>
                </div>
              </div>

              {/* Clean, Mathematical Equation Inspector */}
              <div className="p-4 rounded-xl bg-canvas border border-rule-border font-mono text-xs text-ink-primary shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-ink-muted uppercase pb-2 mb-2.5 border-b border-rule-border">
                  <span className="flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Equation (1) · Scaled Dot-Product Attention</span>
                  </span>
                  <span className="text-accent-emerald font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Anchor
                  </span>
                </div>

                {/* Restrained Formula with Clickable Variables */}
                <div className="text-sm sm:text-base font-semibold overflow-x-auto py-2 flex items-center gap-1 flex-wrap">
                  <span>Attention(</span>
                  <button
                    onClick={() => setActiveFormulaVar('Q')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'Q'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    Q
                  </button>
                  <span className="text-ink-muted">,</span>
                  <button
                    onClick={() => setActiveFormulaVar('K')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'K'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    K
                  </button>
                  <span className="text-ink-muted">,</span>
                  <button
                    onClick={() => setActiveFormulaVar('V')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'V'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    V
                  </button>
                  <span>) = </span>
                  <button
                    onClick={() => setActiveFormulaVar('softmax')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'softmax'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    softmax
                  </button>
                  <span>( (Q K^T) / </span>
                  <button
                    onClick={() => setActiveFormulaVar('dk')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'dk'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    √d_k
                  </button>
                  <span> ) </span>
                  <button
                    onClick={() => setActiveFormulaVar('V')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      activeFormulaVar === 'V'
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'hover:bg-surface-elevated text-ink-primary'
                    }`}
                  >
                    V
                  </button>
                </div>

                {/* Variable Breakdown Card */}
                {activeFormulaVar === 'dk' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-accent-cyan font-semibold mb-1">
                      <span>Variable: √d_k (Scaling Normalizer)</span>
                      <span>d_k = 64 · √64 = 8.0</span>
                    </div>
                    <p className="text-ink-body">
                      Without scaling by <strong>√d_k</strong>, dot product magnitudes grow proportionally with dimension. Large values push the softmax function into regions where gradients approach zero (saturation).
                    </p>
                  </div>
                )}
                {activeFormulaVar === 'Q' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-accent-cyan font-semibold mb-1">
                      <span>Variable: Q (Query Vector)</span>
                      <span>Shape: [Batch, Seq, 64]</span>
                    </div>
                    <p className="text-ink-body">
                      Represents what the current token searches for in other sequence elements, projected through learned weights <code className="text-accent-cyan">W^Q</code>.
                    </p>
                  </div>
                )}
                {activeFormulaVar === 'K' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-accent-cyan font-semibold mb-1">
                      <span>Variable: K (Key Vector)</span>
                      <span>Shape: [Batch, Seq, 64]</span>
                    </div>
                    <p className="text-ink-body">
                      Represents the addressing identity of candidate tokens against which queries compute cosine compatibility logits.
                    </p>
                  </div>
                )}
                {activeFormulaVar === 'V' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-accent-cyan font-semibold mb-1">
                      <span>Variable: V (Value Vector)</span>
                      <span>Shape: [Batch, Seq, 64]</span>
                    </div>
                    <p className="text-ink-body">
                      The substantive payload retrieved and linearly aggregated according to the computed softmax attention distribution.
                    </p>
                  </div>
                )}
                {activeFormulaVar === 'softmax' && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-rule-border text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-accent-cyan font-semibold mb-1">
                      <span>Operator: Softmax Function</span>
                      <span>Σ weights = 1.0</span>
                    </div>
                    <p className="text-ink-body">
                      Exponentiates and normalizes scaled dot-product logits into a strictly valid probability distribution over the sequence.
                    </p>
                  </div>
                )}
              </div>

              {/* Academic Paragraph 2 */}
              <div className="flex gap-3 group">
                <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                  02
                </span>
                <div className="flex-1">
                  We compute the dot products of the query with all keys, divide each by <span className="font-mono text-accent-cyan font-semibold">√d_k</span>, and apply a softmax function to obtain the weights on the values. We suspect that for large values of <span className="font-mono">d_k</span>, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients.
                  <button
                    onClick={() => {
                      setWorkbenchTab('heatmap');
                      setActiveHeadId(2);
                    }}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated text-accent-cyan hover:border-accent-cyan/40 border border-rule-border text-[10px] font-mono font-medium transition-colors"
                  >
                    <Grid className="w-3 h-3" />
                    <span>[Inspect Head Matrix]</span>
                  </button>
                </div>
              </div>

              {/* Section 3.2.2 Multi-Head */}
              <div className="pt-2 border-t border-rule-border">
                <div className="flex gap-3 group">
                  <span className="font-mono text-ink-subtle select-none text-[11px] pt-0.5 w-6 text-right shrink-0">
                    03
                  </span>
                  <div className="flex-1">
                    <strong className="text-ink-primary font-semibold block mb-1">
                      3.2.2 Multi-Head Attention Subspaces
                    </strong>
                    Instead of performing a single attention function with <span className="font-mono">d_model</span>-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values <span className="font-mono font-semibold text-accent-cyan">h = 8</span> times with different, learned linear projections.
                    <button
                      onClick={() => setWorkbenchTab('flashcards')}
                      className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated text-ink-muted hover:text-ink-primary border border-rule-border text-[10px] font-mono font-medium transition-colors"
                    >
                      <Layers className="w-3 h-3" />
                      <span>[Test Recall Card]</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 p-3.5 rounded-lg bg-canvas border border-rule-border font-mono text-xs text-ink-primary">
                  <div className="flex items-center justify-between text-[10px] text-ink-muted uppercase pb-1.5 mb-2 border-b border-rule-border">
                    <span>Equation (2) · Multi-Head Projection</span>
                    <span className="text-ink-muted">h = 8 heads, d_k = 64</span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-ink-primary overflow-x-auto py-1">
                    MultiHead(Q, K, V) = Concat(head_1, ..., head_8) W^O
                  </div>
                  <div className="mt-1 text-[11px] text-ink-muted">
                    Where <code className="text-accent-cyan">head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pane 3: Right Interactive AI Interrogation & Study Workbench */}
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
            {/* Unified Quiet Workbench Tab Navigation */}
            <div className="px-3 py-2 border-b border-rule-border bg-surface-elevated flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWorkbenchTab('heatmap')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'heatmap'
                      ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Head Heatmap</span>
                </button>

                <button
                  onClick={() => setWorkbenchTab('tutor')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'tutor'
                      ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Socratic</span>
                </button>

                <button
                  onClick={() => setWorkbenchTab('flashcards')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'flashcards'
                      ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Drill Deck</span>
                </button>

                <button
                  onClick={() => setWorkbenchTab('graph')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    workbenchTab === 'graph'
                      ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Concept Map</span>
                </button>
              </div>

              <span className="text-[10px] text-accent-emerald font-semibold hidden sm:inline">
                LIVE TENSOR
              </span>
            </div>

            {/* Studio Workbench Body */}
            <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              {/* TAB 1: ATTENTION HEATMAP MATRIX (CLEAN SCIENTIFIC CYAN SCALE) */}
              {workbenchTab === 'heatmap' && (
                <div className="flex-1 flex flex-col justify-between space-y-3 font-mono text-xs">
                  <div>
                    {/* Header with Head Selector */}
                    <div className="flex items-center justify-between pb-2 border-b border-rule-border text-ink-muted">
                      <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>TRANSFORMER ATTENTION WEIGHTS</span>
                      </span>
                      <span className="text-[10px] text-accent-cyan font-semibold">
                        Layer 1 · Multi-Head
                      </span>
                    </div>

                    {/* 8-Head Selector: Clean Monospace Buttons */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ATTENTION_HEADS.map((h) => {
                        const isHeadActive = activeHeadId === h.id;
                        return (
                          <button
                            key={h.id}
                            onClick={() => setActiveHeadId(h.id)}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                              isHeadActive
                                ? 'bg-surface-elevated border-accent-cyan text-accent-cyan'
                                : 'bg-canvas border-rule-border text-ink-muted hover:text-ink-primary'
                            }`}
                          >
                            H{h.id}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Head Summary */}
                    <div className="mt-2 p-2.5 rounded-lg border border-rule-border bg-surface-elevated flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan">
                          {activeHead.name}
                        </span>
                        <div className="text-[11px] font-medium text-ink-primary mt-0.5">
                          {activeHead.role}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-rule-border text-ink-muted">
                        d_k = 64
                      </span>
                    </div>

                    {/* Token Query Strip */}
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-1.5 flex items-center justify-between">
                        <span>QUERY TOKEN (Q)</span>
                        <span className="text-ink-subtle">Click token to inspect</span>
                      </div>

                      <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-canvas border border-rule-border">
                        {SENTENCE_TOKENS.map((token) => (
                          <button
                            key={token}
                            onClick={() => setSelectedToken(token)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              selectedToken === token
                                ? 'bg-accent-cyan text-slate-950 font-bold'
                                : 'bg-surface-elevated text-ink-muted hover:text-ink-primary'
                            }`}
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clean Attention Weight Bars (Cyan Intensity) */}
                    <div className="mt-3 space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                      <div className="text-[10px] uppercase text-ink-muted font-semibold flex items-center justify-between">
                        <span>WEIGHTS FROM &ldquo;{selectedToken.toUpperCase()}&rdquo; → KEYS</span>
                        <span>PROB</span>
                      </div>

                      {SENTENCE_TOKENS.map((token) => {
                        const weight = activeHead.weightsForIt[token] || 0.05;
                        const percentage = Math.round(weight * 100);
                        const isHigh = percentage > 30;

                        return (
                          <div key={token} className="flex items-center gap-2 text-[11px]">
                            <span className="w-14 truncate text-ink-muted font-medium text-right shrink-0">
                              {token}
                            </span>
                            <div className="flex-1 h-3.5 bg-canvas rounded overflow-hidden border border-rule-border relative">
                              <div
                                className={`h-full rounded transition-all duration-300 ${
                                  isHigh ? 'bg-accent-cyan' : 'bg-accent-cyan/40'
                                }`}
                                style={{ width: `${Math.max(percentage, 4)}%` }}
                              />
                            </div>
                            <span
                              className={`w-9 text-right font-semibold text-[10px] shrink-0 ${
                                isHigh ? 'text-accent-cyan font-bold' : 'text-ink-muted'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rule-border text-[10px] text-ink-muted flex items-center justify-between">
                    <span>Winograd Coreference: &ldquo;it&rdquo; resolves to &ldquo;animal&rdquo; (91%)</span>
                    <span className="text-accent-emerald font-semibold">Entropy: 0.42</span>
                  </div>
                </div>
              )}

              {/* TAB 2: SOCRATIC AI INTERROGATION */}
              {workbenchTab === 'tutor' && (
                <div className="flex-1 flex flex-col justify-between space-y-3 font-sans">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted pb-2 border-b border-rule-border">
                      <span className="flex items-center gap-1.5 font-semibold text-ink-primary">
                        <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>GROUNDED SOCRATIC INTERROGATOR</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-rule-border font-mono text-ink-muted">
                        STRICT RAG ANCHOR
                      </span>
                    </div>

                    {/* Pre-populated Prompt Chips: Clean Monospace */}
                    <div className="flex flex-wrap gap-1.5 font-mono">
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
                        Positional Sinusoids
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
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
                            {msg.citation && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded border border-rule-border bg-surface text-accent-cyan font-mono">
                                Anchored
                              </span>
                            )}
                          </div>
                          <p>{msg.text}</p>
                          {msg.citation && (
                            <div className="mt-2 pt-1.5 border-t border-rule-border text-[10px] font-mono text-accent-cyan flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-accent-emerald" />
                              <span>{msg.citation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {isAnswering && (
                        <div className="p-3 rounded-lg bg-canvas border border-rule-border text-xs font-mono text-ink-muted animate-pulse">
                          Tracing citations across vectors and synthesizing response...
                        </div>
                      )}
                    </div>
                  </div>

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
                      className="px-3.5 py-2 rounded-lg bg-accent-cyan text-slate-950 text-xs font-mono font-medium hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
                    >
                      Probe
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: ACTIVE RECALL DRILL DECK */}
              {workbenchTab === 'flashcards' && (
                <div className="flex-1 flex flex-col justify-between space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-rule-border text-ink-muted">
                      <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>LEITNER ACTIVE RECALL DECK</span>
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        Card {cardIndex + 1} of {FLASHCARDS.length}
                      </span>
                    </div>

                    {/* Quiet Step Indicator */}
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-[10px] text-center font-mono">
                      <div className={`p-1 rounded border ${currentCard.box === 1 ? 'border-accent-cyan bg-surface-elevated text-accent-cyan font-semibold' : 'border-rule-border bg-canvas text-ink-muted'}`}>
                        Box 1 (1d)
                      </div>
                      <div className={`p-1 rounded border ${currentCard.box === 2 ? 'border-accent-cyan bg-surface-elevated text-accent-cyan font-semibold' : 'border-rule-border bg-canvas text-ink-muted'}`}>
                        Box 2 (3d)
                      </div>
                      <div className={`p-1 rounded border ${currentCard.box === 3 ? 'border-accent-cyan bg-surface-elevated text-accent-cyan font-semibold' : 'border-rule-border bg-canvas text-ink-muted'}`}>
                        Box 3 (7d)
                      </div>
                      <div className={`p-1 rounded border ${currentCard.box === 4 ? 'border-accent-cyan bg-surface-elevated text-accent-cyan font-semibold' : 'border-rule-border bg-canvas text-ink-muted'}`}>
                        Box 4 (Done)
                      </div>
                    </div>

                    {/* Flashcard */}
                    <div
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className="mt-3 p-4 rounded-xl border border-rule-border bg-canvas cursor-pointer hover:border-rule-strong transition-all shadow-sm min-h-[170px] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border border-rule-border bg-surface text-accent-cyan">
                            {currentCard.tag}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {currentCard.retention}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-ink-primary leading-snug font-sans">
                          {cardFlipped ? currentCard.answer : currentCard.question}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-rule-border flex items-center justify-between text-[10px] text-ink-muted">
                        <span>{currentCard.citation}</span>
                        <span className="text-accent-cyan flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          {cardFlipped ? 'Click to show prompt' : 'Click to flip answer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Rating Controls */}
                  <div className="pt-2 border-t border-rule-border">
                    {cardFeedback ? (
                      <div className="text-center py-1 text-xs font-mono text-accent-emerald flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Recorded &ldquo;{cardFeedback}&rdquo; · Updated Leitner Interval</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleCardRating('Hard')}
                          className="flex-1 py-1.5 rounded-lg border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-ink-primary hover:border-rule-strong transition-colors font-medium"
                        >
                          Hard (1d)
                        </button>
                        <button
                          onClick={() => handleCardRating('Good')}
                          className="flex-1 py-1.5 rounded-lg border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-accent-cyan hover:border-accent-cyan transition-colors font-medium"
                        >
                          Good (3d)
                        </button>
                        <button
                          onClick={() => handleCardRating('Easy')}
                          className="flex-1 py-1.5 rounded-lg border border-rule-border bg-surface-elevated text-xs text-ink-muted hover:text-accent-emerald hover:border-accent-emerald transition-colors font-medium"
                        >
                          Easy (7d)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONCEPT DEPENDENCY GRAPH */}
              {workbenchTab === 'graph' && (
                <div className="flex-1 flex flex-col justify-between space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-rule-border text-ink-muted">
                      <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-accent-cyan" />
                        <span>CONCEPT DEPENDENCY GRAPH</span>
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        DAG Node View
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-2 p-3 rounded-xl bg-canvas border border-rule-border">
                      <div className="p-2 rounded-lg bg-surface-elevated border border-rule-strong flex items-center justify-between">
                        <span className="font-bold text-ink-primary flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
                          Transformer Architecture (Vaswani 2017)
                        </span>
                        <span className="text-[10px] text-accent-cyan font-semibold">ROOT</span>
                      </div>

                      <div className="ml-4 pl-3 border-l-2 border-rule-border space-y-2">
                        <div className="p-2 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-ink-primary block">
                              ├── Scaled Dot-Product Attention
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              Normalizes variance via 1/√d_k to prevent saturation
                            </span>
                          </div>
                          <span className="text-[10px] text-accent-emerald font-semibold">Grounded</span>
                        </div>

                        <div className="p-2 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-ink-primary block">
                              ├── Multi-Head Projections (h = 8)
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              Splits into 8 learned subspaces (d_k=64)
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-muted">Review Due</span>
                        </div>

                        <div className="p-2 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-ink-primary block">
                              └── O(1) Computational Complexity
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              Constant sequential path length enables full parallel GPU compute
                            </span>
                          </div>
                          <span className="text-[10px] text-accent-emerald font-semibold">Mastered</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rule-border text-[10px] text-ink-muted flex items-center justify-between">
                    <span>Generated from vector embeddings</span>
                    <button
                      onClick={() => router.push('/diagram')}
                      className="text-accent-cyan hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Full Studio Mindmap</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Research Ingestion Desk */}
        <div className="p-4 sm:p-5 rounded-xl border border-rule-border bg-surface text-xs font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rule-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-primary text-sm font-sans">
                  Research Ingestion & Semantic Chunking Engine
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated border border-rule-border text-ink-muted font-semibold">
                  Spring AI + pgvector
                </span>
              </div>
              <p className="text-ink-muted text-[11px] font-sans mt-0.5">
                Ingest PDF papers, arXiv IDs, or YouTube lecture transcripts into verified mathematical matrices.
              </p>
            </div>

            {/* Clean Neutral Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-elevated border border-rule-border text-[11px]">
              <button
                onClick={() => {
                  setIngestMode('pdf');
                  setIngestInput('Attention-Is-All-You-Need_Vaswani-2017.pdf');
                }}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  ingestMode === 'pdf'
                    ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Paper</span>
              </button>
              <button
                onClick={() => {
                  setIngestMode('arxiv');
                  setIngestInput('arxiv:2501.12948 (DeepSeek-R1)');
                }}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  ingestMode === 'arxiv'
                    ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>arXiv DOI</span>
              </button>
              <button
                onClick={() => {
                  setIngestMode('youtube');
                  setIngestInput('https://youtube.com/watch?v=CS229-Attention-AndrewNg');
                }}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  ingestMode === 'youtube'
                    ? 'bg-surface border border-rule-strong text-accent-cyan font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>YouTube Sync</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              className="flex-1 w-full px-3 py-2 rounded-lg border border-rule-border bg-canvas text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-mono"
            />
            <button
              onClick={handleStartIngest}
              disabled={isIngesting}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-semibold bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-50 shadow-sm shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isIngesting ? 'Ingesting Pipeline...' : 'Ingest & Index Corpus'}</span>
            </button>
          </div>

          {/* 4-Phase Clean Pipeline */}
          {isIngesting && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className={`p-2 rounded-lg border transition-all ${ingestStep >= 1 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10 font-semibold' : 'border-rule-border text-ink-muted'}`}>
                1. Text Tokenization & OCR
              </div>
              <div className={`p-2 rounded-lg border transition-all ${ingestStep >= 2 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10 font-semibold' : 'border-rule-border text-ink-muted'}`}>
                2. Semantic Heading Chunking
              </div>
              <div className={`p-2 rounded-lg border transition-all ${ingestStep >= 3 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10 font-semibold' : 'border-rule-border text-ink-muted'}`}>
                3. Vector Embedding (1536-dim)
              </div>
              <div className={`p-2 rounded-lg border transition-all ${ingestStep >= 4 ? 'border-accent-emerald text-accent-emerald bg-emerald-500/10 font-semibold' : 'border-rule-border text-ink-muted'}`}>
                4. Studio Knowledge Ready
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Interactive Keyboard Command Palette (Cmd+K) Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-rule-border bg-surface shadow-2xl overflow-hidden font-mono text-xs">
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
                  setWorkbenchTab('heatmap');
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-elevated flex items-center justify-between text-ink-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Inspect Transformer Attention Heatmap</span>
                </span>
                <span className="text-ink-muted text-[10px]">Tab 1</span>
              </button>
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
                <span className="text-ink-muted text-[10px]">Tab 2</span>
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
                <span className="text-ink-muted text-[10px]">Tab 3</span>
              </button>
            </div>

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
                className="w-full mt-4 py-2.5 rounded-lg text-xs font-semibold bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
