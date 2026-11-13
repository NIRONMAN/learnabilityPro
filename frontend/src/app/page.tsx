'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage } from '@/lib/api';
import { SanctuaryHeader } from '@/components/SanctuaryHeader';
import {
  BookOpen,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Command,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
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
  Brain
} from 'lucide-react';

type StudyMode = 'read' | 'interrogate' | 'recall';

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
    answer: 'For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Dividing by √d_k counteracts this variance scaling and stabilizes backpropagation.',
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

export default function ZenStudyStudioPage() {
  const router = useRouter();

  // Active state
  const [activeDocKey, setActiveDocKey] = useState<string>('vaswani');
  const [activeMode, setActiveMode] = useState<StudyMode>('read');
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-3-2');

  // Text selection popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Command palette & Ingestion modals
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestType, setIngestType] = useState<'pdf' | 'arxiv' | 'youtube'>('pdf');
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

  // Guest pass / Auth
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);

  const doc = DOC_PRESETS[activeDocKey];
  const activeCard = FLASHCARD_DECK[cardIndex];

  // Global keyboard shortcuts
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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const query = customQuery || (selectionPopover ? `Can you explain the significance of "${selectionPopover.text}" in detail?` : '');
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
        quote: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.'
      };

      const lower = query.toLowerCase();
      if (lower.includes('scale') || lower.includes('root') || lower.includes('variance') || lower.includes('d_k')) {
        replyText =
          'The scaling factor 1/√d_k is mathematically critical. When d_k is large, the dot products grow large, pushing the softmax function into regions of extremely small gradients (vanishing gradients). Multiplying by 1/√d_k scales the variance back to 1.';
        replyCitation = {
          section: '§3.2.1 Scaled Dot-Product Attention',
          quote: 'To illustrate why the dot products get large, assume that the components of q and k are independent random variables with mean 0 and variance 1. Then their dot product has mean 0 and variance d_k.'
        };
      } else if (lower.includes('complexity') || lower.includes('o(1)') || lower.includes('rnn') || lower.includes('path')) {
        replyText =
          'In recurrent layers (RNNs), passing information between two distant positions requires O(n) sequential steps. In Self-Attention, the maximum path length between any two words is strictly O(1), allowing gradients to propagate directly without sequential degradation.';
        replyCitation = {
          section: '§4.0 Table 1: Maximum Path Lengths',
          quote: 'Self-Attention layer: O(1) sequential operations, O(n² · d) complexity per layer, O(1) maximum path length.'
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
    }, 450);
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
    }, 900);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-primary font-sans antialiased selection:bg-accent-cyan/20 selection:text-ink-primary">
      {/* Top Universal Studio Header */}
      <SanctuaryHeader onOpenCommandPalette={() => setIsCommandOpen(true)} />

      {/* Focused Mode & Document Control Bar */}
      <div className="border-b border-rule-border bg-surface/80 backdrop-blur-md sticky top-14 z-30 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          {/* Active Document Selector */}
          <div className="flex items-center gap-2">
            <select
              value={activeDocKey}
              onChange={(e) => setActiveDocKey(e.target.value)}
              className="bg-surface-elevated border border-rule-border text-ink-primary text-xs rounded-md px-2.5 py-1 font-mono focus:outline-none focus:border-accent-cyan transition-colors"
            >
              <option value="vaswani">Vaswani et al. (2017) · Attention Is All You Need</option>
              <option value="deepseek">DeepSeek-R1 (2025) · Reasoning via RL</option>
              <option value="cs229">Stanford CS229 · Machine Learning Lectures</option>
            </select>

            <span className="hidden sm:inline text-ink-muted text-xs font-mono">
              {doc.readTime} study
            </span>
          </div>

          {/* Tri-Mode Cognitive Switcher */}
          <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
            <button
              onClick={() => setActiveMode('read')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeMode === 'read'
                  ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read</span>
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
              <span>Interrogate</span>
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
              <span>Recall ({FLASHCARD_DECK.length})</span>
            </button>
          </div>

          {/* Ingest Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsIngestOpen(true)}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-rule-border hover:border-rule-strong text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-accent-cyan" />
              <span className="hidden sm:inline">Ingest</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Study Workspace */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* ========================================================= */}
        {/* MODE 1: FOCUS READ (Distraction-Free Sanctuary)            */}
        {/* ========================================================= */}
        {activeMode === 'read' && (
          <div className="max-w-2xl mx-auto" onMouseUp={handleReaderMouseUp}>
            {/* Monograph Header */}
            <div className="mb-10 pb-6 border-b border-rule-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                  {doc.type}
                </span>
                <span className="text-xs text-ink-muted font-mono">{doc.venue}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary mb-3 leading-snug">
                {doc.title}
              </h1>
              <p className="text-xs text-ink-muted font-mono mb-4">{doc.authors}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
                <span className="flex items-center gap-1 text-accent-emerald">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {doc.groundedScore}% Grounded Provenance
                </span>
                <span>·</span>
                <span>Highlight any passage to summon Scholar AI</span>
              </div>
            </div>

            {/* Reading Document Body */}
            <article className="prose prose-invert max-w-none text-ink-body leading-relaxed space-y-6 text-[15px]">
              {/* Section 1 */}
              <section id="sec-1" className="group">
                <div className="flex items-baseline justify-between text-ink-muted font-mono text-xs mb-2">
                  <span className="font-semibold text-accent-cyan">§ 1.0 Introduction</span>
                  <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Page 1</span>
                </div>
                <p>
                  Recurrent neural networks, long short-term memory (LSTM), and gated recurrent neural networks have been firmly established as state-of-the-art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Subsequent efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures.
                </p>
                <p className="mt-4">
                  Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">h_t</code>, as a function of the previous hidden state <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">h_t-1</code> and the input for position <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">t</code>.
                </p>
              </section>

              {/* Section 2 Callout */}
              <section id="sec-2" className="group my-8 p-4 rounded-lg bg-surface border border-rule-border">
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-2">
                  § 2.0 Architectural Bottleneck: The Sequential Constraint
                </div>
                <p className="text-sm text-ink-body">
                  This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.
                </p>
              </section>

              {/* Section 3.2 Main Technical Core */}
              <section id="sec-3-2" className="group">
                <div className="flex items-baseline justify-between text-ink-muted font-mono text-xs mb-2">
                  <span className="font-semibold text-accent-cyan">§ 3.2 Multi-Head Attention</span>
                  <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Page 4 · Core Insight</span>
                </div>
                <p>
                  An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.
                </p>

                {/* Mathematical Equation Anchor */}
                <div className="my-6 p-4 rounded-lg bg-surface border border-rule-border text-center font-mono text-sm sm:text-base text-ink-primary">
                  <div className="text-xs text-ink-muted mb-2 font-mono">Equation (1): Scaled Dot-Product Attention</div>
                  <div className="tracking-wide py-2">
                    Attention(<span className="text-accent-cyan font-semibold">Q</span>, <span className="text-accent-cyan font-semibold">K</span>, <span className="text-accent-cyan font-semibold">V</span>) = softmax(
                    <span className="underline decoration-accent-cyan/60 underline-offset-4">QKᵀ / √d_k</span>)V
                  </div>
                  <div className="text-xs text-ink-muted mt-2">
                    Dimension: <span className="text-ink-primary">Q, K ∈ ℝ^{'{n × d_k}'}</span>, <span className="text-ink-primary">V ∈ ℝ^{'{n × d_v}'}</span>
                  </div>
                </div>

                <p>
                  We compute the dot products of the query with all keys, divide each by <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">√d_k</code>, and apply a softmax function to obtain the weights on the values. We suspect that for large values of <code className="text-xs font-mono px-1 py-0.5 rounded bg-surface-elevated text-ink-primary">d_k</code>, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients.
                </p>
              </section>

              {/* Quick Jump to Socratic Interrogation */}
              <div className="my-10 pt-6 border-t border-rule-border flex items-center justify-between">
                <span className="text-xs font-mono text-ink-muted">Need deeper clarity on this section?</span>
                <button
                  onClick={() => {
                    setActiveMode('interrogate');
                    handleSendMessage('Explain the mathematical intuition behind dividing QK^T by √d_k in Equation 1.');
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-mono bg-surface-elevated hover:bg-surface border border-rule-border text-accent-cyan flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interrogate §3.2 with Socratic AI</span>
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
                className="z-50 bg-surface-elevated border border-rule-border shadow-xl rounded-lg p-1.5 flex items-center gap-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  onClick={() => handleExplainSelection()}
                  className="px-2.5 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Explain Passage</span>
                </button>
                <button
                  onClick={() => {
                    setActiveMode('recall');
                    setSelectionPopover(null);
                  }}
                  className="px-2.5 py-1 rounded hover:bg-surface text-ink-muted hover:text-ink-primary flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Recall Card</span>
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

        {/* ========================================================= */}
        {/* MODE 2: INTERROGATE (Calm 2-Pane Socratic Dialogue)       */}
        {/* ========================================================= */}
        {activeMode === 'interrogate' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Anchored Reference Text */}
            <div className="rounded-xl border border-rule-border bg-surface p-6 text-sm leading-relaxed max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-rule-border font-mono text-xs text-ink-muted">
                <span className="font-semibold text-ink-primary">Source Anchor: {doc.title}</span>
                <span className="text-accent-emerald flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Grounded
                </span>
              </div>

              <div className="space-y-4 text-ink-body">
                <p className="bg-accent-cyan/5 border-l-2 border-accent-cyan pl-3 py-1 text-ink-primary">
                  <strong>§ 3.2 Multi-Head Attention:</strong> Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.
                </p>
                <div className="p-3 rounded bg-canvas border border-rule-border font-mono text-xs text-center">
                  Attention(Q, K, V) = softmax(QKᵀ / √d_k)V
                </div>
                <p className="text-xs text-ink-muted">
                  <strong>§ 4.0 Complexity:</strong> Self-attention connects all positions with a constant number of sequentially executed operations (O(1)), whereas recurrent layers require O(n) sequential operations.
                </p>
              </div>
            </div>

            {/* Right Column: Grounded Socratic Dialogue */}
            <div className="rounded-xl border border-rule-border bg-surface flex flex-col h-[75vh]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-rule-border flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="font-semibold text-ink-primary">Socratic Companion</span>
                </div>
                <span className="text-[11px] text-ink-muted">Strict Ground-Truth RAG</span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-accent-cyan text-slate-950 font-medium'
                          : 'bg-surface-elevated text-ink-body border border-rule-border'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Grounded Citation Card */}
                    {msg.citation && (
                      <div className="mt-2 max-w-[88%] rounded-md bg-canvas border border-rule-border p-2 text-[11px] font-mono text-ink-muted">
                        <div className="flex items-center gap-1.5 text-accent-emerald font-semibold mb-1">
                          <Check className="w-3 h-3" />
                          <span>{msg.citation.section}</span>
                        </div>
                        <p className="italic text-ink-subtle">"{msg.citation.quote}"</p>
                      </div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 text-xs font-mono text-ink-muted p-2">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                    <span>Retrieving verified document embeddings...</span>
                  </div>
                )}
              </div>

              {/* Recommended Inquiry Prompts */}
              <div className="px-4 py-2 border-t border-rule-border flex gap-2 overflow-x-auto text-[11px] font-mono">
                <button
                  onClick={() => handleSendMessage('Why divide by √d_k instead of d_k?')}
                  className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors"
                >
                  Why √d_k scaling?
                </button>
                <button
                  onClick={() => handleSendMessage('Explain O(1) path length vs RNNs.')}
                  className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors"
                >
                  O(1) path length vs RNN
                </button>
                <button
                  onClick={() => handleSendMessage('How does multi-head attention preserve subspaces?')}
                  className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors"
                >
                  Subspace preservation
                </button>
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-rule-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question grounded in this literature..."
                    className="flex-1 bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary placeholder:text-ink-subtle focus:outline-none focus:border-accent-cyan transition-colors font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isThinking}
                    className="p-2 rounded-md bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 disabled:opacity-40 transition-opacity"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: ACTIVE RECALL (Focused Spaced Repetition)          */}
        {/* ========================================================= */}
        {activeMode === 'recall' && (
          <div className="max-w-xl mx-auto py-6">
            {/* Progress & Deck Meta */}
            <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-6">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Leitner Deck: {doc.title}</span>
              </span>
              <span>
                Card {cardIndex + 1} of {FLASHCARD_DECK.length}
              </span>
            </div>

            {/* 3D Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full min-h-[260px] p-8 rounded-xl bg-surface border border-rule-border hover:border-rule-strong cursor-pointer transition-all flex flex-col justify-between shadow-lg relative group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-4">
                  <span className="px-2 py-0.5 rounded bg-surface-elevated border border-rule-border">
                    {isFlipped ? 'Answer & Proof' : 'Question'}
                  </span>
                  <span className="text-accent-cyan flex items-center gap-1">
                    Click card to {isFlipped ? 'hide answer' : 'reveal answer'}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-medium text-ink-primary leading-relaxed">
                  {isFlipped ? activeCard.answer : activeCard.question}
                </div>
              </div>

              {/* Source Provenance Citation */}
              <div className="pt-4 border-t border-rule-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span className="text-accent-emerald flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {activeCard.citation}
                </span>
                <span>Box {activeCard.box} ({activeCard.interval})</span>
              </div>
            </div>

            {/* Leitner Spaced Repetition Grading */}
            {isFlipped ? (
              <div className="mt-6 flex items-center justify-between gap-3 font-mono text-xs animate-in fade-in duration-200">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                    setReviewedCount((c) => c + 1);
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-center"
                >
                  Again (1d)
                </button>
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                    setReviewedCount((c) => c + 1);
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-center"
                >
                  Hard (3d)
                </button>
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                    setReviewedCount((c) => c + 1);
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-all text-center"
                >
                  Good (6d)
                </button>
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => (prev + 1) % FLASHCARD_DECK.length);
                    setReviewedCount((c) => c + 1);
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20 transition-all text-center"
                >
                  Easy (14d)
                </button>
              </div>
            ) : (
              <div className="mt-6 text-center text-xs font-mono text-ink-muted">
                Press spacebar or click card to reveal answer
              </div>
            )}
          </div>
        )}
      </main>

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

            {/* Type selector */}
            <div className="flex rounded-lg border border-rule-border p-1 bg-surface-elevated mb-4 text-xs font-mono">
              <button
                type="button"
                onClick={() => setIngestType('pdf')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'pdf' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                PDF Paper
              </button>
              <button
                type="button"
                onClick={() => setIngestType('arxiv')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'arxiv' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                arXiv DOI
              </button>
              <button
                type="button"
                onClick={() => setIngestType('youtube')}
                className={`flex-1 py-1 rounded ${
                  ingestType === 'youtube' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                YouTube URL
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              {ingestType === 'pdf' && (
                <div className="border border-dashed border-rule-border rounded-lg p-6 text-center hover:border-accent-cyan cursor-pointer transition-colors bg-canvas">
                  <Upload className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
                  <div className="text-xs text-ink-primary font-medium mb-1">
                    Drag and drop your research PDF here
                  </div>
                  <div className="text-[11px] text-ink-muted font-mono">
                    Up to 50MB · Automatic 1536-dim vector indexing
                  </div>
                </div>
              )}

              {ingestType === 'arxiv' && (
                <div>
                  <label className="block text-xs font-mono text-ink-muted mb-1">
                    arXiv DOI or URL
                  </label>
                  <input
                    type="text"
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    placeholder="e.g. 2501.12948 or https://arxiv.org/abs/2501.12948"
                    className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              )}

              {ingestType === 'youtube' && (
                <div>
                  <label className="block text-xs font-mono text-ink-muted mb-1">
                    Academic Lecture URL
                  </label>
                  <input
                    type="text"
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
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
                  className="px-4 py-1.5 text-xs font-mono rounded-md bg-accent-cyan text-slate-950 font-semibold hover:bg-accent-cyan/90 transition-opacity"
                >
                  {isIngesting ? 'Indexing Embeddings...' : 'Index & Open'}
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
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-rule-border">
              <Search className="w-4 h-4 text-accent-cyan" />
              <input
                type="text"
                autoFocus
                placeholder="Jump to section, formula, or study tool..."
                className="flex-1 bg-transparent text-ink-primary focus:outline-none placeholder:text-ink-subtle"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-rule-border text-[10px] text-ink-muted">
                ESC
              </kbd>
            </div>

            {/* Quick Actions List */}
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
                  <span>Switch to Focus Read Mode</span>
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
                  <span>Open Grounded Socratic Tutor</span>
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
                  <span>Review Active Recall Flashcards</span>
                </div>
                <span className="text-[10px] text-ink-subtle">Leitner</span>
              </button>

              <button
                onClick={() => {
                  setIsIngestOpen(true);
                  setIsCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-elevated flex items-center justify-between text-ink-muted hover:text-ink-primary"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Ingest New Research Paper / Video</span>
                </div>
                <span className="text-[10px] text-ink-subtle">RAG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
