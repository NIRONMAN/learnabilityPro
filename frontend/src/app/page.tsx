'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authStorage } from '@/lib/api';
import {
  BookOpen,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Command,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  FileText,
  Upload,
  Plus,
  X,
  Send,
  HelpCircle,
  Hash,
  Layers,
  Check,
  Clock,
  Bookmark,
  Share2,
  Compass,
  Cpu,
  Brain,
  Video,
  GitBranch,
  ArrowDown,
  Layers3,
  Network,
  GraduationCap
} from 'lucide-react';

type StudyMode = 'read' | 'interrogate' | 'diagram' | 'recall';

interface DocMeta {
  id: string;
  title: string;
  type: string;
  authors: string;
  venue: string;
  readTime: string;
  groundedScore: number;
}

const DOC_PRESETS: Record<string, DocMeta> = {
  vaswani: {
    id: 'vaswani',
    title: 'Attention Is All You Need',
    type: 'PDF Paper',
    authors: 'Vaswani et al. (Google Brain & Research)',
    venue: 'NeurIPS 2017 · Citations: 120k+',
    readTime: '12 min',
    groundedScore: 98.4
  },
  deepseek: {
    id: 'deepseek',
    title: 'DeepSeek-R1: Incentivizing Reasoning via RL',
    type: 'arXiv Monograph',
    authors: 'DeepSeek-AI Team',
    venue: 'arXiv:2501.12948 (2025)',
    readTime: '18 min',
    groundedScore: 99.1
  },
  cs229: {
    id: 'cs229',
    title: 'Stanford CS229: Machine Learning Foundations',
    type: 'Lecture Series',
    authors: 'Prof. Andrew Ng',
    venue: 'Stanford University (2023)',
    readTime: '24 min',
    groundedScore: 97.6
  }
};

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  citation: string;
  interval: string;
  box: number;
}

const FLASHCARD_DECK: Flashcard[] = [
  {
    id: 'fc-1',
    question: 'Why does Scaled Dot-Product Attention divide logits by √d_k?',
    answer: 'For large values of d_k, dot products grow large in magnitude, pushing softmax into regions with extremely small gradients. Dividing by √d_k counteracts this variance scaling and stabilizes backpropagation.',
    citation: '§3.2.1 Scaled Dot-Product Attention (p. 4)',
    interval: '3 days',
    box: 2
  },
  {
    id: 'fc-2',
    question: 'What is the computational complexity per layer of Self-Attention vs Recurrent layers?',
    answer: 'Self-Attention requires O(1) sequential operations with O(n² · d) total complexity, whereas Recurrent layers require O(n) sequential operations with O(n · d²) complexity, forming an unparallelizable bottleneck.',
    citation: 'Table 1: Maximum path lengths & complexity (p. 6)',
    interval: '6 days',
    box: 3
  },
  {
    id: 'fc-3',
    question: 'How does Multi-Head Attention outperform a single attention function of dimension d_model?',
    answer: 'It jointly attends to information from different representation subspaces at different positions. A single attention head performs averaging which inhibits attending to multiple subspace relationships simultaneously.',
    citation: '§3.2.2 Multi-Head Attention (p. 5)',
    interval: '1 day',
    box: 1
  }
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citation?: {
    section: string;
    quote: string;
  };
}

export default function LearnabilityLandingAndStudio() {
  const router = useRouter();

  // Active studio state
  const [activeDocKey, setActiveDocKey] = useState<string>('vaswani');
  const [activeMode, setActiveMode] = useState<StudyMode>('read');

  // Text selection popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Command palette & Ingestion modals
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestType, setIngestType] = useState<'pdf' | 'arxiv' | 'youtube' | 'topic'>('pdf');
  const [ingestInput, setIngestInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  // Socratic dialogue state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Welcome to the Vaswani et al. (2017) study session. The document is indexed with 98.4% grounded provenance. What concept or mathematical proof would you like to examine?',
      citation: {
        section: '§1.0 Abstract & Introduction',
        quote: 'We propose the Transformer, a model architecture relying entirely on an attention mechanism to draw global dependencies between input and output.'
      }
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Active Recall state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Active Concept Node state in Diagram view
  const [activeConceptNode, setActiveConceptNode] = useState<string>('mha');

  // Guest pass / Auth
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);

  const doc = DOC_PRESETS[activeDocKey];
  const activeCard = FLASHCARD_DECK[cardIndex];

  // Global keyboard shortcuts and header event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        setIsIngestOpen(false);
        setSelectionPopover(null);
      }
    };

    const handleOpenPalette = () => setIsCommandOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenPalette);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenPalette);
    };
  }, []);

  // Handle text selection in reader
  const handleReaderMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopover(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 4) {
      setSelectionPopover(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopover({
        text,
        x: Math.max(16, rect.left + rect.width / 2),
        y: rect.top - 12
      });
    } catch {
      setSelectionPopover(null);
    }
  };

  // Trigger Socratic question from selection
  const handleExplainSelection = (customQuery?: string) => {
    const query =
      customQuery ||
      (selectionPopover ? `Can you explain the significance of "${selectionPopover.text}" in detail?` : '');
    if (!query) return;

    setActiveMode('interrogate');
    setSelectionPopover(null);
    handleSendMessage(query);
  };

  // Submit message to Socratic Tutor
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      let replyText = '';
      let replyCitation = {
        section: '§3.2 Multi-Head Attention',
        quote:
          'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.'
      };

      const lower = query.toLowerCase();
      if (
        lower.includes('scale') ||
        lower.includes('root') ||
        lower.includes('variance') ||
        lower.includes('d_k')
      ) {
        replyText =
          'The scaling factor 1/√d_k is mathematically critical. When d_k is large, the dot products grow large, pushing the softmax function into regions of extremely small gradients. Multiplying by 1/√d_k scales the variance back to 1.';
        replyCitation = {
          section: '§3.2.1 Scaled Dot-Product Attention',
          quote:
            'To illustrate why the dot products get large, assume that the components of q and k are independent random variables with mean 0 and variance 1. Then their dot product has mean 0 and variance d_k.'
        };
      } else if (
        lower.includes('complexity') ||
        lower.includes('o(1)') ||
        lower.includes('rnn') ||
        lower.includes('path')
      ) {
        replyText =
          'In recurrent layers (RNNs), passing information between two distant positions requires O(n) sequential steps. In Self-Attention, the maximum path length between any two words is strictly O(1), allowing gradients to propagate directly without sequential degradation.';
        replyCitation = {
          section: '§4.0 Table 1: Maximum Path Lengths',
          quote:
            'Self-Attention layer: O(1) sequential operations, O(n² · d) complexity per layer, O(1) maximum path length.'
        };
      } else {
        replyText = `Based on grounded analysis of ${doc.title}: this mechanism decouples sequence transformation from recurrent state tracking. The attention weights dynamically construct a weighted adjacency matrix over the entire context window in parallel.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          citation: replyCitation
        }
      ]);
      setIsThinking(false);
    }, 700);
  };

  // 1-Click Guest Pass
  const handleQuickScholarPass = () => {
    setIsGeneratingPass(true);
    setTimeout(() => {
      authStorage.setToken('guest_scholar_token_distraction_free');
      setIsGeneratingPass(false);
      router.push('/dashboard');
    }, 400);
  };

  // Ingestion mock submission
  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestInput.trim()) return;

    setIsIngesting(true);
    setTimeout(() => {
      setIsIngesting(false);
      setIsIngestOpen(false);
      setIngestInput('');
      setActiveDocKey('deepseek');
      setActiveMode('read');
      const studioElem = document.getElementById('live-studio');
      if (studioElem) studioElem.scrollIntoView({ behavior: 'smooth' });
    }, 850);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-primary font-sans antialiased selection:bg-accent-cyan/20 selection:text-ink-primary">
      {/* ========================================================= */}
      {/* 1. BRAND HERO SECTION: MISSION & POSITIONING              */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden border-b border-rule-border pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 text-center">
          {/* Brand Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rule-border bg-surface-elevated text-xs font-mono text-ink-muted mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
            <span className="text-ink-primary font-medium">Learnability Pro</span>
            <span className="text-rule-strong">·</span>
            <span>Multimodal Cognitive Deep-Work Studio</span>
          </div>

          {/* Core Brand Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-primary mb-6 leading-tight max-w-4xl mx-auto">
            Transform Dense Literature Into <br className="hidden sm:inline" />
            <span className="text-accent-cyan">Permanent Comprehension.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-ink-body max-w-2xl mx-auto mb-10 leading-relaxed">
            Generic AI chat produces detached summaries that hallucinate. Learnability Pro pairs source literature with structured cognitive primitives: grounded Socratic interrogation, visual concept hierarchies, and active recall drills.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            <a
              href="#live-studio"
              className="px-5 py-3 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Test-Drive Live Studio Below</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleQuickScholarPass}
              disabled={isGeneratingPass}
              className="px-5 py-3 rounded-lg border border-rule-border bg-surface hover:bg-surface-elevated text-ink-primary font-semibold transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-accent-cyan" />
              <span>{isGeneratingPass ? 'Activating Pass...' : '1-Click Scholar Pass'}</span>
            </button>

            <a
              href="#modalities"
              className="px-4 py-3 rounded-lg text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1.5"
            >
              <span>Explore The 4 Learning Primitives</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Core Trust Badges */}
          <div className="mt-14 pt-8 border-t border-rule-border grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">0% Hallucination</div>
              <div className="text-[11px] text-ink-muted">Strict source-anchored mathematical provenance</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Multi-Modal</div>
              <div className="text-[11px] text-ink-muted">PDF Papers, arXiv DOIs, YouTube & Topics</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Mermaid DAGs</div>
              <div className="text-[11px] text-ink-muted">Concept relationship trees and prerequisite maps</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Leitner Recall</div>
              <div className="text-[11px] text-ink-muted">4-box spaced repetition for long-term retention</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. THE 4 MODALITIES OF LEARNING IN OUR APPLICATION         */}
      {/* ========================================================= */}
      <section id="modalities" className="py-20 border-b border-rule-border bg-surface/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-accent-cyan font-semibold">
              The Cognitive Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mt-2 mb-3">
              Four Deliberate Stages of True Mastery
            </h2>
            <p className="text-sm text-ink-body">
              How Learnability Pro takes you from raw information to fluent, long-term conceptual recall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modality 1: Multi-Modal Ingestion */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 01 · Ingestion</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Topic, PDF & YouTube Ingestion
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Ingest textbooks, slide decks, arXiv papers, or video lecture transcripts. Materials are tokenized and indexed into 1536-dimensional vector space with exact paragraph and equation anchors.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Supports: PDF, arXiv DOI, YouTube URLs, Curated Topics</span>
                <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>

            {/* Modality 2: Grounded Socratic Interrogation */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 02 · Interrogation</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Socratic Interrogation & Probe Sessions
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Reading alone is passive. The Socratic tutor actively challenges your reasoning, asking targeted probe questions on mathematical steps, trade-offs, and proofs—with zero detached hallucination.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>100% Grounded citations with section & page markers</span>
                <span className="text-accent-cyan font-semibold">Live Probing</span>
              </div>
            </div>

            {/* Modality 3: Visual Concept Hierarchies & Diagrams */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <Network className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 03 · Visual Hierarchy</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Mermaid Concept Trees & Relationship DAGs
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Understand complex topics through architectural relationships. Automatic Mermaid diagrams map dependencies, architectural layers, and cross-attention connections so you see the big picture.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Dynamic directed acyclic graphs & concept maps</span>
                <span className="text-accent-cyan font-semibold">Mermaid.js</span>
              </div>
            </div>

            {/* Modality 4: Leitner Spaced Repetition Flashcards */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 04 · Long-Term Retention</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Leitner Active Recall Spaced Repetition
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Convert key concepts into structured flashcards generated straight from literature. The 4-box Leitner system schedules reviews (1d, 3d, 6d, 14d) to guarantee permanent memory consolidation.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Adaptive Leitner interval scheduling</span>
                <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> High Retention
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE LIVE STUDY STUDIO SANDBOX                  */}
      {/* ========================================================= */}
      <section id="live-studio" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          {/* Studio Header Bar */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-mono uppercase tracking-wider text-accent-cyan font-semibold">
              Live Product Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mt-1 mb-2">
              The Distraction-Free Study Studio
            </h2>
            <p className="text-xs text-ink-muted font-mono">
              Test-drive all 4 learning modalities right here with Vaswani et al. (2017)
            </p>
          </div>

          {/* Studio Controls Header */}
          <div className="border border-rule-border rounded-t-xl bg-surface p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Preset Document Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ink-muted hidden sm:inline">Literature:</span>
              <select
                value={activeDocKey}
                onChange={(e) => setActiveDocKey(e.target.value)}
                className="bg-surface-elevated border border-rule-border text-ink-primary text-xs rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="vaswani">Vaswani et al. (2017) · Attention Is All You Need</option>
                <option value="deepseek">DeepSeek-R1 (2025) · Reasoning via RL</option>
                <option value="cs229">Stanford CS229 · Machine Learning Lectures</option>
              </select>
            </div>

            {/* Studio Mode Switcher */}
            <div className="flex items-center bg-surface-elevated p-1 rounded-lg border border-rule-border">
              <button
                onClick={() => setActiveMode('read')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeMode === 'read'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>1. Read</span>
              </button>

              <button
                onClick={() => setActiveMode('interrogate')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeMode === 'interrogate'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>2. Socratic Chat</span>
              </button>

              <button
                onClick={() => setActiveMode('diagram')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeMode === 'diagram'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>3. Concept Tree</span>
              </button>

              <button
                onClick={() => setActiveMode('recall')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeMode === 'recall'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>4. Recall ({FLASHCARD_DECK.length})</span>
              </button>
            </div>

            {/* Ingestion Trigger Button */}
            <button
              onClick={() => setIsIngestOpen(true)}
              className="px-3 py-1.5 text-xs font-mono rounded-md bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest New Material</span>
            </button>
          </div>

          {/* Studio Container */}
          <div className="border-x border-b border-rule-border rounded-b-xl bg-canvas p-6 sm:p-8 min-h-[520px]">
            {/* --------------------------------------------------------- */}
            {/* MODE 1: FOCUS READ (Distraction-Free Sanctuary)            */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'read' && (
              <div className="max-w-2xl mx-auto" onMouseUp={handleReaderMouseUp}>
                <div className="mb-8 pb-4 border-b border-rule-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                      {doc.type}
                    </span>
                    <span className="text-xs text-ink-muted font-mono">{doc.venue}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-primary mb-2">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
                    <span className="text-accent-emerald flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {doc.groundedScore}% Grounded Provenance
                    </span>
                    <span>·</span>
                    <span className="text-ink-subtle">Highlight any sentence to summon Scholar AI</span>
                  </div>
                </div>

                <article className="space-y-6 text-[15px] leading-relaxed text-ink-body">
                  <section>
                    <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">§ 1.0 Introduction</div>
                    <p>
                      Recurrent neural networks factor computation along the symbol positions of the input and output sequences. Aligning positions to steps in computation time, they generate a sequence of hidden states <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">h_t</code>. This inherently sequential nature precludes parallelization within training examples.
                    </p>
                  </section>

                  <section className="p-4 rounded-lg bg-surface border border-rule-border">
                    <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">
                      § 3.2 Multi-Head Attention Mechanism
                    </div>
                    <p className="text-sm">
                      An attention function can be described as mapping a query and a set of key-value pairs to an output. Instead of performing a single attention function, we found it beneficial to linearly project queries, keys, and values <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">h = 8</code> times with different, learned linear projections.
                    </p>
                    <div className="my-4 p-3 rounded bg-canvas border border-rule-border text-center font-mono text-sm text-ink-primary">
                      Attention(<span className="text-accent-cyan font-semibold">Q</span>, <span className="text-accent-cyan font-semibold">K</span>, <span className="text-accent-cyan font-semibold">V</span>) = softmax(QKᵀ / √d_k)V
                    </div>
                    <p className="text-xs text-ink-muted">
                      Dividing by <code className="font-mono text-ink-primary">√d_k</code> prevents the dot products from growing large, avoiding saturation in regions of vanishing gradients.
                    </p>
                  </section>

                  {/* Fast Jump CTAs */}
                  <div className="pt-4 flex items-center justify-between border-t border-rule-border">
                    <button
                      onClick={() => {
                        setActiveMode('interrogate');
                        handleSendMessage('Explain why √d_k variance normalization is required.');
                      }}
                      className="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask Socratic AI about §3.2</span>
                    </button>
                    <button
                      onClick={() => setActiveMode('diagram')}
                      className="text-xs font-mono text-ink-muted hover:text-ink-primary flex items-center gap-1"
                    >
                      <span>View Concept Relationship Tree</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>

                {/* Contextual Floating Selection Popover */}
                {selectionPopover && (
                  <div
                    style={{
                      position: 'fixed',
                      left: `${selectionPopover.x}px`,
                      top: `${selectionPopover.y}px`,
                      transform: 'translate(-50%, -100%)'
                    }}
                    className="z-50 bg-surface-elevated border border-rule-border shadow-2xl rounded-lg p-1.5 flex items-center gap-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      onClick={() => handleExplainSelection()}
                      className="px-2.5 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Explain with AI</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMode('recall');
                        setSelectionPopover(null);
                      }}
                      className="px-2.5 py-1 rounded hover:bg-surface text-ink-muted hover:text-ink-primary flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Flashcard</span>
                    </button>
                    <button
                      onClick={() => setSelectionPopover(null)}
                      className="p-1 rounded hover:bg-surface text-ink-muted hover:text-ink-primary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 2: SOCRATIC CHAT & PROBE SESSIONS                    */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'interrogate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Anchored Reference */}
                <div className="rounded-xl border border-rule-border bg-surface p-5 text-sm max-h-[460px] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-rule-border font-mono text-xs text-ink-muted">
                    <span className="font-semibold text-ink-primary">Grounded Document Excerpt</span>
                    <span className="text-accent-emerald flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 98.4% Provenance
                    </span>
                  </div>
                  <div className="space-y-3 text-xs leading-relaxed text-ink-body">
                    <div className="p-3 rounded bg-accent-cyan/5 border-l-2 border-accent-cyan">
                      <strong>§ 3.2.1 Scaled Dot-Product Attention:</strong> We compute dot products of the query with all keys, divide each by √d_k, and apply a softmax function to obtain weights on values.
                    </div>
                    <div className="p-3 rounded bg-surface-elevated font-mono text-center">
                      Attention(Q, K, V) = softmax(QKᵀ / √d_k)V
                    </div>
                    <p className="text-ink-muted">
                      <strong>§ 4.0 Table 1:</strong> Maximum path length between any two word positions is O(1) in self-attention, compared to O(n) in recurrent layers.
                    </p>
                  </div>
                </div>

                {/* Right: Dialogue Box */}
                <div className="rounded-xl border border-rule-border bg-surface flex flex-col h-[460px]">
                  <div className="px-4 py-3 border-b border-rule-border font-mono text-xs flex items-center justify-between">
                    <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                      Socratic Tutor
                    </span>
                    <span className="text-ink-muted text-[11px]">Strict Verification Active</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-lg p-3 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-accent-cyan text-slate-950 font-medium'
                              : 'bg-surface-elevated text-ink-body border border-rule-border'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {msg.citation && (
                          <div className="mt-1.5 max-w-[90%] rounded bg-canvas border border-rule-border p-2 text-[11px] font-mono text-ink-muted">
                            <span className="text-accent-emerald font-semibold block mb-0.5">
                              ✓ {msg.citation.section}
                            </span>
                            <span className="italic text-ink-subtle">"{msg.citation.quote}"</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {isThinking && (
                      <div className="flex items-center gap-2 text-xs font-mono text-ink-muted p-2">
                        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                        <span>Retrieving verified document citations...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Probe Prompts */}
                  <div className="px-3 py-2 border-t border-rule-border flex gap-2 overflow-x-auto text-[11px] font-mono">
                    <button
                      onClick={() => handleSendMessage('Why divide by √d_k instead of d_k?')}
                      className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors"
                    >
                      Why √d_k?
                    </button>
                    <button
                      onClick={() => handleSendMessage('Compare O(1) path length vs RNNs.')}
                      className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors"
                    >
                      O(1) vs RNN
                    </button>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="p-3 border-t border-rule-border flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      placeholder="Ask a technical or mathematical question..."
                      className="flex-1 bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!inputQuery.trim() || isThinking}
                      className="p-2 rounded-md bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 3: CONCEPT TREE & RELATIONSHIP HIERARCHY             */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'diagram' && (
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-rule-border font-mono text-xs text-ink-muted">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-accent-cyan" />
                    Mermaid Concept DAG: Vaswani et al. Architecture
                  </span>
                  <span className="text-[11px] text-accent-cyan">Interactive Nodes</span>
                </div>

                {/* Visual Concept Flowchart Mockup */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {/* Node 1 */}
                    <button
                      onClick={() => setActiveConceptNode('input')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        activeConceptNode === 'input'
                          ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan shadow-md'
                          : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="text-[10px] text-ink-muted uppercase mb-1">Layer 1</div>
                      <div className="font-bold text-sm mb-1 text-ink-primary">Positional Encoding</div>
                      <div className="text-[11px] leading-tight">Sinusoidal frequencies inject sequential order</div>
                    </button>

                    {/* Node 2 */}
                    <button
                      onClick={() => setActiveConceptNode('mha')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        activeConceptNode === 'mha'
                          ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan shadow-md'
                          : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="text-[10px] text-ink-muted uppercase mb-1">Layer 2 (Core)</div>
                      <div className="font-bold text-sm mb-1 text-ink-primary">Multi-Head Attention</div>
                      <div className="text-[11px] leading-tight">8 parallel subspace projections with √d_k scaling</div>
                    </button>

                    {/* Node 3 */}
                    <button
                      onClick={() => setActiveConceptNode('ffn')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        activeConceptNode === 'ffn'
                          ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan shadow-md'
                          : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="text-[10px] text-ink-muted uppercase mb-1">Layer 3</div>
                      <div className="font-bold text-sm mb-1 text-ink-primary">Feed-Forward Network</div>
                      <div className="text-[11px] leading-tight">Position-wise two-layer linear transformation</div>
                    </button>
                  </div>

                  {/* Relationship Inspector Box */}
                  <div className="p-5 rounded-xl border border-rule-border bg-surface font-mono text-xs">
                    <div className="text-ink-muted text-[11px] mb-2 uppercase tracking-wider">
                      Selected Relationship & Structural Verification:
                    </div>
                    {activeConceptNode === 'input' && (
                      <div>
                        <div className="font-bold text-ink-primary text-sm mb-1">
                          Positional Encodings: PE(pos, 2i) = sin(pos/10000^(2i/d_model))
                        </div>
                        <p className="text-ink-body font-sans text-xs leading-relaxed mt-2">
                          Because the model contains no recurrence and no convolution, for it to use the order of the sequence, we must inject information about relative or absolute positions.
                        </p>
                      </div>
                    )}
                    {activeConceptNode === 'mha' && (
                      <div>
                        <div className="font-bold text-ink-primary text-sm mb-1">
                          Multi-Head Attention: Concat(head_1, ..., head_8)W^O
                        </div>
                        <p className="text-ink-body font-sans text-xs leading-relaxed mt-2">
                          Multi-head attention allows the model to jointly attend to information from different representation subspaces. Each head linearly projects queries, keys, and values to d_k = 64 dimensions.
                        </p>
                      </div>
                    )}
                    {activeConceptNode === 'ffn' && (
                      <div>
                        <div className="font-bold text-ink-primary text-sm mb-1">
                          Position-Wise FFN: max(0, xW_1 + b_1)W_2 + b_2
                        </div>
                        <p className="text-ink-body font-sans text-xs leading-relaxed mt-2">
                          While the linear transformations are identical across different positions, they use different parameters from layer to layer. The inner-layer dimensionality is d_ff = 2048.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 4: ACTIVE RECALL (Leitner Flashcard Drill)           */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'recall' && (
              <div className="max-w-xl mx-auto py-4">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-4">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Leitner Deck: {doc.title}</span>
                  </span>
                  <span>Card {cardIndex + 1} of {FLASHCARD_DECK.length}</span>
                </div>

                {/* 3D Flip Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full min-h-[220px] p-6 rounded-xl bg-surface border border-rule-border hover:border-rule-strong cursor-pointer transition-all flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-3">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated border border-rule-border">
                        {isFlipped ? 'Answer & Proof' : 'Active Recall Prompt'}
                      </span>
                      <span className="text-accent-cyan">Click to {isFlipped ? 'hide' : 'reveal'}</span>
                    </div>
                    <div className="text-base font-medium text-ink-primary leading-relaxed">
                      {isFlipped ? activeCard.answer : activeCard.question}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-rule-border flex items-center justify-between text-xs font-mono text-ink-muted">
                    <span className="text-accent-emerald flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {activeCard.citation}
                    </span>
                    <span>Box {activeCard.box} ({activeCard.interval})</span>
                  </div>
                </div>

                {/* Leitner Grading Buttons */}
                {isFlipped ? (
                  <div className="mt-4 flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-center"
                    >
                      Again (1d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-center"
                    >
                      Hard (3d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-center"
                    >
                      Good (6d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20 text-center"
                    >
                      Easy (14d)
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center text-xs font-mono text-ink-muted">
                    Click the card to reveal the answer and grade your retention
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. FINAL CALL TO ACTION                                   */}
      {/* ========================================================= */}
      <section className="py-20 border-t border-rule-border bg-surface text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mb-3">
            Ready for Rigorous, Distraction-Free Study?
          </h2>
          <p className="text-sm text-ink-body mb-8 max-w-xl mx-auto leading-relaxed">
            Ingest your own research PDFs, YouTube lecture playlists, or technical topics and experience verifiable cognitive acceleration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            <button
              onClick={handleQuickScholarPass}
              disabled={isGeneratingPass}
              className="px-6 py-3 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <span>{isGeneratingPass ? 'Entering Studio...' : 'Launch Scholar Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsIngestOpen(true)}
              className="px-6 py-3 rounded-lg border border-rule-border bg-surface-elevated hover:bg-canvas text-ink-primary font-semibold transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-accent-cyan" />
              <span>Ingest Document</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* QUICK INGESTION MODAL                                     */}
      {/* ========================================================= */}
      {isIngestOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-rule-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-rule-border mb-4">
              <h3 className="text-sm font-semibold text-ink-primary font-mono">
                Ingest Research Material
              </h3>
              <button
                onClick={() => setIsIngestOpen(false)}
                className="text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex rounded-lg border border-rule-border p-1 bg-surface-elevated mb-4 text-xs font-mono">
              <button
                type="button"
                onClick={() => setIngestType('pdf')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'pdf' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setIngestType('arxiv')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'arxiv' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                arXiv
              </button>
              <button
                type="button"
                onClick={() => setIngestType('youtube')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'youtube' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => setIngestType('topic')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'topic' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                Topic
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              {ingestType === 'pdf' && (
                <div className="border border-dashed border-rule-border rounded-lg p-6 text-center hover:border-accent-cyan cursor-pointer transition-colors bg-canvas">
                  <Upload className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
                  <div className="text-xs text-ink-primary font-medium mb-1">
                    Drag and drop research PDF
                  </div>
                  <div className="text-[11px] text-ink-muted font-mono">
                    1536-dim vector embeddings automatically generated
                  </div>
                </div>
              )}

              {ingestType === 'arxiv' && (
                <div>
                  <label className="block text-xs font-mono text-ink-muted mb-1">arXiv DOI or URL</label>
                  <input
                    type="text"
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    placeholder="e.g. 2501.12948"
                    className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              )}

              {ingestType === 'youtube' && (
                <div>
                  <label className="block text-xs font-mono text-ink-muted mb-1">Lecture Video URL</label>
                  <input
                    type="text"
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              )}

              {ingestType === 'topic' && (
                <div>
                  <label className="block text-xs font-mono text-ink-muted mb-1">Curated Study Topic</label>
                  <input
                    type="text"
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    placeholder="e.g. Quantum Error Correction or RLHF"
                    className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngestOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono rounded-md border border-rule-border text-ink-muted hover:text-ink-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-4 py-1.5 text-xs font-mono rounded-md bg-accent-cyan text-slate-950 font-semibold hover:bg-accent-cyan/90"
                >
                  {isIngesting ? 'Indexing Embeddings...' : 'Index & Open Studio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMMAND PALETTE MODAL (Cmd+K)                             */}
      {/* ========================================================= */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-surface border border-rule-border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-rule-border">
              <Search className="w-4 h-4 text-accent-cyan" />
              <input
                type="text"
                autoFocus
                placeholder="Jump to section, formula, or tool..."
                className="flex-1 bg-transparent text-ink-primary focus:outline-none placeholder:text-ink-subtle"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-rule-border text-[10px] text-ink-muted">
                ESC
              </kbd>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setActiveMode('read');
                  setIsCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-muted hover:text-ink-primary"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>1. Focus Read Mode</span>
                </div>
                <span className="text-[10px] text-ink-subtle">Mode</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('interrogate');
                  setIsCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-muted hover:text-ink-primary"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>2. Socratic Interrogation</span>
                </div>
                <span className="text-[10px] text-ink-subtle">Mode</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('diagram');
                  setIsCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-muted hover:text-ink-primary"
              >
                <div className="flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>3. Mermaid Concept Tree</span>
                </div>
                <span className="text-[10px] text-ink-subtle">Mode</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('recall');
                  setIsCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-muted hover:text-ink-primary"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>4. Leitner Active Recall Flashcards</span>
                </div>
                <span className="text-[10px] text-ink-subtle">Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
