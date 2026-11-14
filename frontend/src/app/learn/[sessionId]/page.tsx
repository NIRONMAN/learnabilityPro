'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, StudySession, ChatMessage } from '@/lib/api';
import {
  Send,
  Sparkles,
  FileText,
  Youtube,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Network,
  Copy,
  Check,
  X,
  Sun,
  Moon,
  ExternalLink,
  Layers,
  ArrowDown,
  Columns,
  MessageSquare,
  Quote,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import { AgentLogo } from '@/components/AgentLogo';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { SourceMaterialViewer } from '@/components/SourceMaterialViewer';
import { useTheme } from '@/components/ThemeProvider';

export default function LearnWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { theme, toggleTheme } = useTheme();

  // Core session state
  const [session, setSession] = useState<StudySession | null>(null);
  const [sessionsList, setSessionsList] = useState<StudySession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Source Material & Split Screen Layout State
  // 'split': Dual-Pane side-by-side (Material + Chat)
  // 'chat': Full width chat
  // 'material': Full width source material viewer
  const [layoutMode, setLayoutMode] = useState<'split' | 'chat' | 'material'>('split');
  const [hasPdfFile, setHasPdfFile] = useState<boolean>(false);
  const [youtubeStartSec, setYoutubeStartSec] = useState<number | null>(null);
  const [isSessionsDrawerOpen, setIsSessionsDrawerOpen] = useState(false);

  // Smart scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const [sessionData, messageData, allSessions, pdfStatus] = await Promise.all([
        api.getSession(sessionId),
        api.getMessages(sessionId),
        api.listSessions().catch(() => []),
        api.checkPdfStatus(sessionId).catch(() => ({ hasPdf: false })),
      ]);
      setSession(sessionData);
      setMessages(messageData || []);
      setSessionsList(allSessions || []);
      setHasPdfFile(pdfStatus?.hasPdf || false);

      // Default layout: if session has source material (PDF, YouTube, or notes), open in Split View
      const hasMaterial = Boolean(
        sessionData.contextType === 'PDF' ||
        sessionData.contextType === 'YOUTUBE' ||
        (sessionData.contextText && sessionData.contextText.trim().length > 0)
      );
      setLayoutMode(hasMaterial ? 'split' : 'chat');
    } catch (err) {
      console.error('Failed to load session from server:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom smoothly within the chat container only
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Handle scroll events to detect if user has scrolled away from the bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setIsUserScrolledUp(!isNearBottom);
  };

  // Auto-scroll when messages or streaming tokens arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
    }
  }, [messages, streamingResponse, isUserScrolledUp, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(Math.max(scrollHeight, 40), 160) + 'px';
    }
  }, [inputText]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Citation handler: when a user selects text or clicks "Cite in Chat" from the source viewer
  const handleCiteText = (quoteText: string, reference?: string) => {
    const trimmed = quoteText.trim();
    if (!trimmed) return;
    const refHeader = reference ? `[Source Reference: ${reference}]\n` : '';
    const formatted = `${refHeader}> "${trimmed}"\n\n`;

    setInputText((prev) => {
      if (prev.includes(trimmed)) return prev;
      if (!prev.trim()) {
        return formatted;
      }
      return `${prev.trim()}\n\n${formatted}`;
    });

    // If currently in full material view, switch to split view so the user can see their chat input
    if (layoutMode === 'material') {
      setLayoutMode('split');
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 80);
  };

  // "Ask Tutor" immediate inquiry from selection
  const handleAskTutorFromSelection = (questionPrompt: string) => {
    if (layoutMode === 'material') {
      setLayoutMode('split');
    }
    handleSendMessage(questionPrompt);
  };

  // Video seeking handler: when a timestamp is clicked anywhere (transcript or chat)
  const handleSeekVideo = (seconds: number) => {
    setYoutubeStartSec(seconds);
    if (layoutMode === 'chat') {
      setLayoutMode('split');
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const userMsg = (customPrompt || inputText).trim();
    if (!userMsg || isStreaming) return;
    setInputText('');
    setStreamError(null);
    setIsUserScrolledUp(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    const optimisticUserMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      sessionId,
      sender: 'USER',
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    setIsStreaming(true);
    setStreamingResponse('');

    let accumulatedTokens = '';

    try {
      await api.streamChat(
        sessionId,
        userMsg,
        (chunk) => {
          accumulatedTokens += chunk;
          setStreamingResponse(accumulatedTokens);
        },
        () => {
          setIsStreaming(false);
          const assistantMessage: ChatMessage = {
            id: 'assistant-' + Date.now(),
            sessionId,
            sender: 'ASSISTANT',
            content: accumulatedTokens,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingResponse('');
        },
        (err) => {
          setIsStreaming(false);
          setStreamingResponse('');
          setStreamError(err.message || 'Stream connection interrupted. Please try again.');
        }
      );
    } catch (err: any) {
      setIsStreaming(false);
      setStreamingResponse('');
      setStreamError(err.message || 'Failed to connect to AI tutor streaming endpoint.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-canvas flex flex-col items-center justify-center text-ink-muted text-xs font-mono space-y-3">
        <AgentLogo size={36} animated variant="cyan" />
        <div className="flex items-center gap-2 text-ink-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
          <span>Preparing Dual-Pane Study Sanctuary...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-canvas flex flex-col items-center justify-center text-ink-muted space-y-4 font-mono text-xs">
        <AgentLogo size={32} variant="monochrome" />
        <p>Study sanctuary not found.</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-surface border border-rule-border text-accent-cyan hover:border-accent-cyan transition-colors">
          Return to Workspace Dashboard
        </Link>
      </div>
    );
  }

  const isVectorSearchActive = Boolean(
    session.hasVectorStore ??
      (session.contextType === 'PDF' || (session.contextType === 'YOUTUBE' && session.contextText))
  );
  const hasContextText = Boolean(session.contextText && session.contextText.trim().length > 0);
  const hasSourceMaterial = Boolean(session.contextType === 'PDF' || session.contextType === 'YOUTUBE' || hasContextText);

  const sessionTitle = (session.title || 'Study Session').trim();
  const shortTitle =
    sessionTitle
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*:\s*.*/g, '')
      .trim()
      .slice(0, 26) || 'this topic';

  const getSuggestionLabel = (prompt: string): string => {
    const p = prompt.trim();
    if (/technical proficiencies|career highlights/i.test(p)) return 'Technical Proficiencies';
    if (/engineering achievements|impact metrics/i.test(p)) return 'Key Engineering Achievements';
    if (/interview questions/i.test(p)) return 'Interview Prep Questions';
    if (/architectural patterns|system components/i.test(p)) return 'System Architecture';
    if (/scalability considerations|trade-offs/i.test(p)) return 'Trade-offs & Scalability';
    if (/data pipelines|services and data/i.test(p)) return 'Data Flow & Services';
    if (/mathematical derivation/i.test(p)) return 'Mathematical Derivation';
    if (/core trade-offs and complexity/i.test(p)) return 'Complexity & Trade-offs';
    if (/proof or justification/i.test(p)) return 'Formula Proof & Intuition';
    if (/research hypothesis|main contributions/i.test(p)) return 'Core Contributions';
    if (/experimental methodology|empirical results/i.test(p)) return 'Empirical Methodology';
    if (/limitations and potential avenues/i.test(p)) return 'Limitations & Future Work';
    if (/foundational principles/i.test(p)) return 'Foundational Principles';
    if (/real-world example/i.test(p)) return 'Real-World Example';
    if (/common misconceptions/i.test(p)) return 'Common Misconceptions';
    if (/core arguments and central concepts/i.test(p)) return 'Core Concepts';
    if (/terminology and definitions/i.test(p)) return 'Key Terminology';
    if (/active recall/i.test(p)) return 'Active Recall Test';

    if (p.length <= 40) return p;
    const sliced = p.slice(0, 38);
    const lastSpace = sliced.lastIndexOf(' ');
    return (lastSpace > 18 ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
  };

  const dynamicSuggestions: Array<{ label: string; prompt: string }> =
    session.suggestedQuestions && session.suggestedQuestions.length > 0
      ? session.suggestedQuestions.map((q) => ({
          label: getSuggestionLabel(q),
          prompt: q.trim(),
        }))
      : [
          {
            label: `Key principles of ${shortTitle}`,
            prompt: `What are the key foundational principles of ${shortTitle}?`,
          },
          {
            label: 'Core concepts & breakdown',
            prompt: `Can you break down the core concepts and central ideas in ${shortTitle}?`,
          },
          {
            label: 'Test my comprehension',
            prompt: `Test my understanding with challenging active recall questions about ${shortTitle}.`,
          },
        ];

  return (
    <div className="fixed inset-0 h-screen w-screen bg-canvas text-ink-primary font-sans antialiased flex flex-col overflow-hidden selection:bg-accent-cyan/20 selection:text-ink-primary">
      {/* ========================================================= */}
      {/* UNIFIED TOP BAR: Provenance, Layout Controls & Modalities */}
      {/* ========================================================= */}
      <header className="h-14 border-b border-rule-border bg-surface/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 font-mono text-xs z-30">
        {/* Left: Brand Identity + Breadcrumb + Provenance */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="hidden sm:flex items-center gap-2 group shrink-0" title="Learnability Pro Home">
            <AgentLogo size={22} variant="gradient" />
            <span className="font-bold text-xs text-ink-primary hidden md:inline">Learnability</span>
          </Link>

          <span className="text-rule-strong hidden sm:inline">/</span>

          {/* Session Title & Provenance Badge */}
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="font-semibold text-xs text-ink-primary truncate max-w-[140px] sm:max-w-[220px] md:max-w-xs" title={sessionTitle}>
              {sessionTitle}
            </span>
            {isVectorSearchActive ? (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
                98.4% Grounded
              </span>
            ) : hasContextText ? (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 shrink-0">
                <ShieldCheck className="w-3 h-3" /> Source Anchored
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-amber/10 text-accent-amber border border-accent-amber/20 shrink-0">
                <Sparkles className="w-3 h-3" /> Socratic Mode
              </span>
            )}
          </div>
        </div>

        {/* Center: DUAL-PANE VIEW CONTROLS & MODALITY TABS */}
        <div className="flex items-center gap-2">
          {/* Dual-Pane View Mode Switcher */}
          {hasSourceMaterial && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === 'split'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Split View: Side-by-side Source Material and AI Tutor"
              >
                <Columns className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="hidden md:inline">Split Screen</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('material')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === 'material'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Focus Material: Expand PDF / Video to full width"
              >
                {session.contextType === 'YOUTUBE' ? (
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-accent-cyan" />
                )}
                <span className="hidden md:inline">Focus Material</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('chat')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === 'chat'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Focus Chat: Expand Socratic Tutor to full width"
              >
                <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="hidden md:inline">Focus Tutor</span>
              </button>
            </div>
          )}

          {/* Study Modality Links */}
          <div className="hidden xl:flex items-center bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
            <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-canvas text-accent-cyan border border-rule-border shadow-xs flex items-center gap-1.5">
              <AgentLogo size={12} variant="cyan" />
              <span>Interrogate</span>
            </span>

            <Link
              href={`/flashcard/${session.id}`}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
              title="Switch to Leitner Spaced Repetition Flashcards"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent-violet" />
              <span>Recall</span>
            </Link>

            <Link
              href={`/diagram/${session.id}`}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
              title="Switch to Concept Relationship Tree"
            >
              <Network className="w-3.5 h-3.5 text-accent-amber" />
              <span>Concept Map</span>
            </Link>
          </div>
        </div>

        {/* Right: Atmosphere Switcher + All Sanctuaries + Dashboard Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick sessions drawer button */}
          <button
            onClick={() => setIsSessionsDrawerOpen(!isSessionsDrawerOpen)}
            type="button"
            className="p-2 rounded-lg border border-rule-border bg-surface-elevated text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
            title="Browse All Sanctuaries"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleTheme}
            type="button"
            title={`Atmosphere: ${theme.toUpperCase()} (click to cycle)`}
            className="p-2 rounded-lg border border-rule-border bg-surface-elevated text-ink-muted hover:text-ink-primary hover:border-rule-strong transition-all cursor-pointer"
          >
            {theme === 'obsidian' && <Moon className="w-3.5 h-3.5 text-accent-cyan" />}
            {theme === 'aurora' && <Sparkles className="w-3.5 h-3.5 text-accent-violet" />}
            {theme === 'blueprint' && <Sun className="w-3.5 h-3.5 text-accent-amber" />}
          </button>

          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-rule-border bg-surface-elevated hover:bg-surface text-ink-primary font-medium transition-colors flex items-center gap-1.5"
            title="Exit to Workspace Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SESSIONS DRAWER MODAL                                     */}
      {/* ========================================================= */}
      {isSessionsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-80 sm:w-96 bg-surface border-l border-rule-border h-full p-4 flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rule-border pb-3">
              <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-accent-cyan" />
                All Study Sanctuaries ({sessionsList.length})
              </span>
              <button
                onClick={() => setIsSessionsDrawerOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {sessionsList.map((s) => (
                <Link
                  key={s.id}
                  href={`/learn/${s.id}`}
                  onClick={() => setIsSessionsDrawerOpen(false)}
                  className={`block p-3 rounded-lg border text-xs transition-colors ${
                    s.id === sessionId
                      ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan font-bold'
                      : 'border-rule-border bg-surface-elevated hover:border-rule-strong text-ink-primary'
                  }`}
                >
                  <div className="truncate font-semibold">{s.title || 'Untitled Session'}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-muted font-mono">
                    <span>{s.contextType}</span>
                    <span>·</span>
                    <span>{s.sessionType}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN WORKSPACE BODY: DUAL-PANE SPLIT VIEW & CHAT STREAM   */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ======================================================= */}
        {/* LEFT PANE: SOURCE MATERIAL VIEWER (PDF / YOUTUBE)       */}
        {/* ======================================================= */}
        {(layoutMode === 'split' || layoutMode === 'material') && hasSourceMaterial && (
          <div
            className={`${
              layoutMode === 'material'
                ? 'w-full'
                : 'w-full lg:w-1/2'
            } h-full flex flex-col overflow-hidden shrink-0 transition-all duration-200 z-10`}
          >
            <SourceMaterialViewer
              session={session}
              hasPdfFile={hasPdfFile}
              pdfUrl={api.getPdfUrl(sessionId)}
              onCiteText={handleCiteText}
              onAskTutor={handleAskTutorFromSelection}
              youtubeStartSec={youtubeStartSec}
              onSeekVideo={handleSeekVideo}
              onClose={layoutMode === 'material' ? () => setLayoutMode('split') : undefined}
            />
          </div>
        )}

        {/* ======================================================= */}
        {/* RIGHT PANE: SOCRATIC TUTOR CHAT & GROUNDED CITATIONS    */}
        {/* ======================================================= */}
        {layoutMode !== 'material' && (
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-canvas">
            {/* Scrollable Chat Stream Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 min-h-0"
            >
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Welcome Banner when session is fresh */}
                {messages.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 font-mono">
                    <div className="p-4 bg-surface-elevated border border-rule-border rounded-2xl shadow-lg shadow-cyan-500/5">
                      <AgentLogo size={48} animated variant="gradient" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-ink-primary">
                        Socratic Study Sanctuary Active
                      </h3>
                      <p className="text-xs text-ink-muted max-w-md font-sans leading-relaxed">
                        Deep-dive into &quot;{sessionTitle}&quot;. Explore foundational principles, technical concepts, or cite excerpts from your source material on the left.
                      </p>
                    </div>

                    {/* Suggestion prompts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl text-left pt-4">
                      {dynamicSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3 rounded-xl border border-rule-border bg-surface hover:border-accent-cyan hover:bg-surface-elevated text-xs font-sans text-ink-primary transition-all text-left flex items-start gap-2.5 group cursor-pointer shadow-xs"
                          title={item.prompt}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-accent-cyan mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-semibold text-ink-primary text-xs leading-snug">{item.label}</span>
                            <span className="text-[11px] text-ink-muted line-clamp-2 leading-snug font-sans">{item.prompt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Feed */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ASSISTANT' && (
                      <div className="w-8 h-8 rounded-lg bg-surface border border-rule-border flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <AgentLogo size={20} variant="gradient" />
                      </div>
                    )}

                    <div className={`max-w-[88%] sm:max-w-[82%] space-y-1.5 ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                      {/* Speaker Header */}
                      <div className={`flex items-center gap-2 text-[10px] font-mono text-ink-muted px-1 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-semibold text-ink-primary">
                          {msg.sender === 'USER' ? 'You' : 'Socratic Scholar'}
                        </span>
                        {msg.sender === 'ASSISTANT' && (
                          <span className="text-[10px] text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1.5 py-0.2 rounded font-medium">
                            Grounded
                          </span>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-5 py-4 text-xs leading-relaxed shadow-xs transition-all ${
                          msg.sender === 'USER'
                            ? 'bg-accent-cyan text-slate-950 font-medium selection:bg-slate-900 selection:text-white'
                            : 'bg-surface border border-rule-border text-ink-primary'
                        }`}
                      >
                        {msg.sender === 'USER' ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <MarkdownRenderer content={msg.content} onTimestampClick={handleSeekVideo} />
                        )}
                      </div>

                      {/* Action Bar for Assistant Messages (Copy response) */}
                      {msg.sender === 'ASSISTANT' && (
                        <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-ink-muted">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-ink-primary flex items-center gap-1 transition-colors cursor-pointer py-0.5"
                            title="Copy explanation"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-accent-emerald" />
                                <span className="text-accent-emerald text-[10px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'USER' && (
                      <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold text-ink-primary shadow-xs">
                        YOU
                      </div>
                    )}
                  </div>
                ))}

                {/* In-Flight Streaming State with Claude-style Thinking Indicator */}
                {isStreaming && (
                  <div className="flex gap-3.5 justify-start animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-accent-cyan/30 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <AgentLogo size={20} animated variant="cyan" />
                    </div>

                    <div className="max-w-[88%] sm:max-w-[82%] space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted px-1">
                        <span className="font-semibold text-accent-cyan">Socratic Scholar</span>
                        <span className="text-accent-cyan animate-pulse">Reasoning...</span>
                      </div>

                      {!streamingResponse ? (
                        <ThinkingIndicator mode="card" showLogo={false} intervalMs={2400} />
                      ) : (
                        <div className="rounded-2xl px-5 py-4 text-xs leading-relaxed bg-surface border border-accent-cyan/40 text-ink-primary shadow-md">
                          <MarkdownRenderer content={streamingResponse} onTimestampClick={handleSeekVideo} />
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-accent-cyan animate-pulse align-middle" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Streaming Connection Error Banner */}
                {streamError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
                    <span>{streamError}</span>
                    <button
                      onClick={() => setStreamError(null)}
                      className="text-[11px] underline hover:text-red-300 ml-2 cursor-pointer font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Floating "Scroll to Bottom" button if user scrolled up */}
            {isUserScrolledUp && (
              <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-24 right-6 sm:right-10 px-3 py-1.5 rounded-full bg-surface-elevated hover:bg-surface border border-rule-border text-ink-primary text-xs font-mono shadow-lg flex items-center gap-1.5 transition-all cursor-pointer z-20 group"
                title="Jump to latest message"
              >
                <ArrowDown className="w-3.5 h-3.5 text-accent-cyan group-hover:translate-y-0.5 transition-transform" />
                <span>Latest</span>
                {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>}
              </button>
            )}

            {/* Dynamic Suggested Inquiries Strip */}
            <div className="px-4 sm:px-8 py-2 border-t border-rule-border/60 bg-surface/60 backdrop-blur-xs shrink-0">
              <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-[11px]">
                <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold shrink-0">
                  Quick Inquiries:
                </span>
                {dynamicSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 max-w-xs truncate shrink-0"
                    title={item.prompt}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ======================================================= */}
            {/* BOTTOM CHAT INPUT DOCK WITH CITATION SHORTCUTS          */}
            {/* ======================================================= */}
            <div className="p-3 sm:p-4 border-t border-rule-border bg-surface shrink-0">
              <div className="max-w-3xl mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-end gap-2 bg-canvas border border-rule-border rounded-xl p-2 focus-within:border-accent-cyan transition-colors shadow-inner"
                >
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    disabled={isStreaming}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    placeholder={
                      isStreaming
                        ? 'AI Scholar is reasoning...'
                        : hasSourceMaterial
                        ? 'Ask questions or cite literature on the left... (Enter to send)'
                        : 'Ask anything on this subject... (Enter to send)'
                    }
                    className="flex-1 bg-transparent px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none max-h-36 font-sans leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isStreaming}
                    className="px-3 py-2 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-30 disabled:hover:bg-accent-cyan rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                    title="Send message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mt-1.5 px-1">
                  <span>Enter ↵ to send · Shift+Enter for new line</span>
                  {hasSourceMaterial && (
                    <span className="flex items-center gap-1 text-accent-cyan">
                      <Quote className="w-3 h-3" />
                      <span>Highlight text in literature to cite</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
