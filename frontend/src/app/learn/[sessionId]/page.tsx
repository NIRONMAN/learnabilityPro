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
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  ExternalLink,
  Layers,
  ArrowDown
} from 'lucide-react';
import { AgentLogo } from '@/components/AgentLogo';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
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
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Focus & Collapsible Sidebar state (default: FOCUSED VIEW, sidebar collapsed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'source' | 'sessions'>('source');

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
      const [sessionData, messageData, allSessions] = await Promise.all([
        api.getSession(sessionId),
        api.getMessages(sessionId),
        api.listSessions().catch(() => []),
      ]);
      setSession(sessionData);
      setMessages(messageData || []);
      setSessionsList(allSessions || []);
    } catch (err) {
      console.error('Failed to load session from server:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom smoothly within the chat container only (avoids page scroll)
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

  const handleCopyContext = () => {
    if (!session?.contextText) return;
    navigator.clipboard.writeText(session.contextText);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
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

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-canvas flex flex-col items-center justify-center text-ink-muted text-xs font-mono space-y-3">
        <AgentLogo size={36} animated variant="cyan" />
        <div className="flex items-center gap-2 text-ink-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
          <span>Preparing Focused Study Sanctuary...</span>
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

  const youtubeEmbed = getYouTubeEmbedUrl(session.sourceUrl);
  const isVectorSearchActive = Boolean(
    session.hasVectorStore ??
      (session.contextType === 'PDF' || (session.contextType === 'YOUTUBE' && session.contextText))
  );
  const hasContextText = Boolean(session.contextText && session.contextText.trim().length > 0);

  const sessionTitle = (session.title || 'Study Session').trim();
  const shortTitle =
    sessionTitle
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*:\s*.*/g, '')
      .trim()
      .slice(0, 26) || 'this topic';

  const dynamicSuggestions: Array<{ label: string; prompt: string }> =
    session.suggestedQuestions && session.suggestedQuestions.length > 0
      ? session.suggestedQuestions.map((q) => ({ label: q, prompt: q }))
      : [
          {
            label: `Key principles of ${shortTitle}`,
            prompt: `What are the key foundational principles of ${shortTitle}?`,
          },
          {
            label: 'Step-by-step proof/derivation',
            prompt: `Can you walk me through a clear, rigorous mathematical or logical derivation of ${shortTitle}?`,
          },
          {
            label: 'Test my comprehension',
            prompt: `Test my understanding with a challenging conceptual question about ${shortTitle}.`,
          },
        ];

  return (
    <div className="fixed inset-0 h-screen w-screen bg-canvas text-ink-primary font-sans antialiased flex flex-col overflow-hidden selection:bg-accent-cyan/20 selection:text-ink-primary">
      {/* ========================================================= */}
      {/* SINGLE UNIFIED TOP BAR (No stacked bars or clutter)      */}
      {/* ========================================================= */}
      <header className="h-14 border-b border-rule-border bg-surface/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 font-mono text-xs z-30">
        {/* Left: Sidebar Toggle + Brand Identity + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              isSidebarOpen
                ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                : 'bg-surface-elevated hover:bg-surface border-rule-border text-ink-muted hover:text-ink-primary'
            }`}
            title={isSidebarOpen ? 'Hide Reference Sidebar (Focused Mode)' : 'Show Reference Literature & Notes Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            <span className="hidden xl:inline text-[11px] font-medium">
              {isSidebarOpen ? 'Close Reference' : 'Reference & Notes'}
            </span>
          </button>

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

        {/* Center: Mode Switcher Tabs */}
        <div className="hidden lg:flex items-center bg-surface-elevated p-1 rounded-lg border border-rule-border">
          <span className="px-3 py-1 rounded-md text-xs font-semibold bg-canvas text-accent-cyan border border-rule-border shadow-sm flex items-center gap-1.5">
            <AgentLogo size={14} variant="cyan" />
            <span>Socratic Interrogate</span>
          </span>

          <Link
            href={`/flashcard/${session.id}`}
            className="px-3 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
            title="Switch to Leitner Spaced Repetition Flashcards"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent-violet" />
            <span>Active Recall</span>
          </Link>

          <Link
            href={`/diagram/${session.id}`}
            className="px-3 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink-primary hover:bg-canvas/50 transition-colors flex items-center gap-1.5"
            title="Switch to Concept Relationship Tree"
          >
            <Network className="w-3.5 h-3.5 text-accent-amber" />
            <span>Concept Map</span>
          </Link>
        </div>

        {/* Right: Atmosphere Switcher + Dashboard Exit */}
        <div className="flex items-center gap-2 shrink-0">
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
      {/* WORKSPACE BODY: DISTRACTION-FREE FOCUSED VIEW & SIDEBAR   */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* COLLAPSIBLE LEFT SIDEBAR (Source literature, notes & sessions) */}
        {isSidebarOpen && (
          <aside className="w-80 sm:w-96 border-r border-rule-border bg-surface/95 backdrop-blur-md flex flex-col h-full z-20 shrink-0 shadow-xl transition-all duration-200">
            {/* Sidebar Header & Tabs */}
            <div className="p-3 border-b border-rule-border flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
                <button
                  onClick={() => setActiveSidebarTab('source')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeSidebarTab === 'source'
                      ? 'bg-canvas text-accent-cyan border border-rule-border shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  Source Material
                </button>
                <button
                  onClick={() => setActiveSidebarTab('sessions')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeSidebarTab === 'sessions'
                      ? 'bg-canvas text-accent-cyan border border-rule-border shadow-sm'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  All Sanctuaries ({sessionsList.length})
                </button>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSidebarTab === 'source' ? (
                <>
                  {/* Context Info Pill */}
                  <div className="p-3 rounded-lg bg-surface-elevated border border-rule-border text-xs space-y-2">
                    <div className="flex items-center justify-between text-ink-muted font-mono text-[11px]">
                      <span className="flex items-center gap-1.5 font-bold text-ink-primary">
                        {session.contextType === 'YOUTUBE' ? (
                          <Youtube className="w-3.5 h-3.5 text-red-500" />
                        ) : session.contextType === 'PDF' ? (
                          <FileText className="w-3.5 h-3.5 text-accent-cyan" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
                        )}
                        <span>{session.contextType} Material</span>
                      </span>
                      {hasContextText && (
                        <button
                          onClick={handleCopyContext}
                          className="text-ink-muted hover:text-accent-cyan flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy reference context"
                        >
                          {copiedContext ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedContext ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    {session.sourceUrl && (
                      <p className="text-[11px] font-mono text-ink-muted break-all">
                        Source: {session.sourceUrl}
                      </p>
                    )}
                  </div>

                  {/* YouTube Player if applicable */}
                  {session.contextType === 'YOUTUBE' && youtubeEmbed && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-rule-border shadow-md">
                      <iframe
                        src={youtubeEmbed}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* Context Excerpt Body */}
                  {hasContextText ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold">
                        Anchored Reference Notes
                      </span>
                      <div className="p-3.5 rounded-lg bg-canvas border border-rule-border text-xs leading-relaxed font-mono whitespace-pre-wrap text-ink-body max-h-[460px] overflow-y-auto">
                        {session.contextText}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-surface-elevated border border-rule-border text-center text-xs text-ink-muted space-y-2">
                      <Sparkles className="w-5 h-5 mx-auto text-accent-amber" />
                      <p>This session uses generalized deep academic knowledge without uploaded PDF attachments.</p>
                    </div>
                  )}

                  {/* Quick Jump Tools */}
                  <div className="pt-2 border-t border-rule-border space-y-2 font-mono text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
                      Study Modalities
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/flashcard/${session.id}`}
                        className="p-2.5 rounded-lg border border-rule-border bg-surface-elevated hover:bg-surface text-ink-primary flex flex-col gap-1 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-accent-violet" />
                        <span className="text-[11px] font-bold">Recall Flashcards</span>
                      </Link>
                      <Link
                        href={`/diagram/${session.id}`}
                        className="p-2.5 rounded-lg border border-rule-border bg-surface-elevated hover:bg-surface text-ink-primary flex flex-col gap-1 transition-colors"
                      >
                        <Network className="w-4 h-4 text-accent-amber" />
                        <span className="text-[11px] font-bold">Concept Map</span>
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                /* Recent Sanctuaries Switcher */
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold">
                    Switch Study Sanctuary
                  </span>
                  {sessionsList.map((s) => (
                    <Link
                      key={s.id}
                      href={`/learn/${s.id}`}
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
              )}
            </div>
          </aside>
        )}

        {/* ========================================================= */}
        {/* MAIN CHAT AREA (Focused, Impeccable Layout)               */}
        {/* ========================================================= */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-canvas">
          {/* Scrollable Chat Stream Container (The ONLY scrolling element) */}
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
                      Deep-dive into &quot;{sessionTitle}&quot;. Ask for rigorous mathematical proofs, conceptual derivations, or Socratic interrogation grounded in source literature.
                    </p>
                  </div>

                  {/* Suggestion prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl text-left pt-4">
                    {dynamicSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.prompt)}
                        className="p-3 rounded-xl border border-rule-border bg-surface hover:border-accent-cyan hover:bg-surface-elevated text-xs font-sans text-ink-primary transition-all text-left flex items-start gap-2 group cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent-cyan mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="leading-snug">{item.label}</span>
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
                    <div className="w-8 h-8 rounded-lg bg-surface border border-rule-border flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <AgentLogo size={20} variant="gradient" />
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[80%] space-y-1.5 ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
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
                      className={`rounded-2xl px-5 py-4 text-xs leading-relaxed shadow-sm transition-all ${
                        msg.sender === 'USER'
                          ? 'bg-accent-cyan text-slate-950 font-medium selection:bg-slate-900 selection:text-white'
                          : 'bg-surface border border-rule-border text-ink-primary'
                      }`}
                    >
                      {msg.sender === 'USER' ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
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
                    <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-rule-border flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold text-ink-primary shadow-sm">
                      YOU
                    </div>
                  )}
                </div>
              ))}

              {/* In-Flight Streaming State with Claude-style Thinking Indicator */}
              {isStreaming && (
                <div className="flex gap-3.5 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-accent-cyan/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <AgentLogo size={20} animated variant="cyan" />
                  </div>

                  <div className="max-w-[88%] sm:max-w-[80%] space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted px-1">
                      <span className="font-semibold text-accent-cyan">Socratic Scholar</span>
                      <span className="text-accent-cyan animate-pulse">Thinking...</span>
                    </div>

                    {/* Claude-style dynamic status phrases when awaiting stream or tokens */}
                    {!streamingResponse ? (
                      <ThinkingIndicator mode="card" showLogo={false} intervalMs={2400} />
                    ) : (
                      <div className="rounded-2xl px-5 py-4 text-xs leading-relaxed bg-surface border border-accent-cyan/40 text-ink-primary shadow-md">
                        <MarkdownRenderer content={streamingResponse} />
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
          <div className="px-4 sm:px-8 py-2 border-t border-rule-border/60 bg-surface/60 backdrop-blur-sm shrink-0">
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
                  className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40"
                  title={item.prompt}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* BOTTOM CHAT INPUT DOCK ($impeccable Layout)               */}
          {/* ========================================================= */}
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
                      : isVectorSearchActive
                      ? 'Ask the Socratic tutor anything grounded in this literature... (Enter to send)'
                      : hasContextText
                      ? 'Ask questions about your notes and citations... (Enter to send)'
                      : 'Ask anything on this subject... (Enter to send)'
                  }
                  className="flex-1 bg-transparent px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none max-h-36 font-sans leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isStreaming}
                  className="px-3 py-2 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-30 disabled:hover:bg-accent-cyan rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                  title="Send message (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mt-1.5 px-1">
                <span>Enter ↵ to send · Shift+Enter for new line</span>
                <span className="flex items-center gap-1">
                  <AgentLogo size={10} variant="cyan" />
                  <span>Socratic Cognitive Studio</span>
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
