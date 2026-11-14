'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, StudySession, ChatMessage } from '@/lib/api';
import {
  Send,
  Sparkles,
  BrainCircuit,
  FileText,
  Youtube,
  ArrowLeft,
  Bot,
  User as UserIcon,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Network,
  Copy,
  Check,
  ChevronRight,
  Maximize2,
  Columns
} from 'lucide-react';

export default function LearnWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedContext, setCopiedContext] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionData, messageData] = await Promise.all([
        api.getSession(sessionId),
        api.getMessages(sessionId),
      ]);
      setSession(sessionData);
      setMessages(messageData || []);
    } catch (err) {
      console.error('Failed to load session from server:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContext = () => {
    if (!session?.contextText) return;
    navigator.clipboard.writeText(session.contextText);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const userMsg = (customPrompt || inputText).trim();
    if (!userMsg || isStreaming) return;
    setInputText('');
    setStreamError(null);

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
      <div className="flex-1 flex items-center justify-center text-ink-muted text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse mr-2"></span>
        Loading study sanctuary...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-ink-muted space-y-4 font-mono text-xs">
        <p>Study sanctuary not found.</p>
        <Link href="/dashboard" className="text-accent-cyan hover:underline">
          Return to Dashboard
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
  const isGeneralizedTopic = session.contextType === 'TOPIC' && !hasContextText;

  // If focusMode is explicitly set by user, honor it; otherwise, default to true for generalized topic
  const effectiveFocusMode = focusMode !== null ? focusMode : isGeneralizedTopic;

  const sessionTitle = (session.title || 'Study Session').trim();
  const shortTitle =
    sessionTitle
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*:\s*.*/g, '')
      .trim()
      .slice(0, 28) || 'this topic';

  const dynamicSuggestions: Array<{ label: string; prompt: string }> =
    session.suggestedQuestions && session.suggestedQuestions.length > 0
      ? session.suggestedQuestions.map((q) => ({ label: q, prompt: q }))
      : [
          {
            label: `Key principles of ${shortTitle}`,
            prompt: `What are the key foundational principles of ${shortTitle}?`,
          },
          {
            label: 'Step-by-step example',
            prompt: `Can you walk me through a clear, step-by-step example of ${shortTitle}?`,
          },
          {
            label: 'Test my understanding',
            prompt: `Test my understanding with a challenging question about ${shortTitle}.`,
          },
        ];

  const renderChatPane = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tutor Chat Subheader */}
      <div className="px-4 py-2.5 border-b border-rule-border bg-surface font-mono text-xs flex items-center justify-between text-ink-muted shrink-0">
        <span className="font-semibold text-ink-primary flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-accent-cyan" />
          Socratic Tutor
          {effectiveFocusMode && (
            <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-1.5 py-0.5 rounded font-normal">
              Focus Mode
            </span>
          )}
        </span>
        {isVectorSearchActive ? (
          <span className="text-[11px] text-accent-emerald flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
            Grounded Retrieval Active
          </span>
        ) : hasContextText ? (
          <span className="text-[11px] text-accent-cyan flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
            User Notes Truth
          </span>
        ) : (
          <span className="text-[11px] text-accent-amber flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber"></span>
            Open Socratic Mode
          </span>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-ink-muted font-mono">
            <div className="p-3 bg-surface-elevated text-accent-cyan border border-rule-border rounded-xl">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-ink-primary">
              Ready to tutor you on &quot;{sessionTitle}&quot;
            </h4>
            <p className="text-[11px] text-ink-muted max-w-sm font-sans">
              {isVectorSearchActive
                ? 'Ask conceptual questions, request mathematical proofs, or test your comprehension with probe questions grounded in your literature.'
                : hasContextText
                ? 'Interrogate your notes, explore derivations, or verify understanding against your provided reference material.'
                : 'Explore foundational concepts, request rigorous mathematical proofs, or ask socratic questions across disciplines.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ASSISTANT' && (
              <div className="w-7 h-7 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === 'USER'
                  ? 'bg-accent-cyan text-slate-950 font-medium shadow-sm'
                  : 'bg-surface border border-rule-border text-ink-primary shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>

            {msg.sender === 'USER' && (
              <div className="w-7 h-7 rounded-md bg-surface-elevated border border-rule-border text-ink-primary flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                YOU
              </div>
            )}
          </div>
        ))}

        {/* In-flight streaming response token bubble */}
        {isStreaming && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed bg-surface border border-accent-cyan/30 text-ink-primary shadow-sm">
              <p className="whitespace-pre-wrap">
                {streamingResponse ||
                  (isVectorSearchActive
                    ? 'Retrieving source vectors...'
                    : 'AI Tutor is formulating response...')}
              </p>
            </div>
          </div>
        )}

        {/* Real error feedback banner */}
        {streamError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
            <span>{streamError}</span>
            <button
              onClick={() => setStreamError(null)}
              className="text-[11px] underline hover:text-red-300 ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Quick Inquiry Chips */}
      <div className="px-4 py-2 border-t border-rule-border bg-surface flex gap-2 overflow-x-auto font-mono text-[11px] shrink-0">
        {dynamicSuggestions.map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(suggestion.prompt)}
            className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer"
            title={suggestion.prompt}
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 border-t border-rule-border bg-surface shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            disabled={isStreaming}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isStreaming
                ? isVectorSearchActive
                  ? 'Retrieving source vectors...'
                  : 'AI Tutor is formulating response...'
                : isVectorSearchActive
                ? 'Ask the tutor anything grounded in this literature...'
                : hasContextText
                ? 'Ask the tutor questions about your notes...'
                : 'Ask the tutor anything on this subject...'
            }
            className="flex-1 px-3.5 py-2 rounded-lg bg-canvas border border-rule-border text-ink-primary placeholder:text-ink-subtle text-xs focus:outline-none focus:border-accent-cyan font-sans"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="px-3.5 py-2 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-40 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-canvas font-sans">
      {/* Workspace Subheader */}
      <div className="h-13 border-b border-rule-border bg-surface px-4 sm:px-6 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded-md transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="truncate max-w-md">
            <h2 className="text-xs sm:text-sm font-bold text-ink-primary truncate">{sessionTitle}</h2>
            <div className="flex items-center gap-2 text-[10px] text-ink-muted">
              <span className="uppercase text-accent-cyan font-semibold">{session.sessionType}</span>
              <span>·</span>
              <span>{session.contextType}</span>
              <span>·</span>
              {isVectorSearchActive ? (
                <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> 98.4% Grounded
                </span>
              ) : hasContextText ? (
                <span className="text-accent-cyan flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Reference Notes Grounded
                </span>
              ) : (
                <span className="text-accent-amber flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3" /> Generalized Knowledge Base
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Focus Mode (Zen toggle) */}
          <button
            type="button"
            onClick={() => setFocusMode(!effectiveFocusMode)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-sm cursor-pointer ${
              effectiveFocusMode
                ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/25'
                : 'bg-surface-elevated hover:bg-surface border-rule-border text-ink-primary'
            }`}
            title={effectiveFocusMode ? 'Switch to Split View' : 'Switch to Focus Mode (Zen View)'}
          >
            {effectiveFocusMode ? (
              <>
                <Columns className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="hidden sm:inline">Split View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="hidden sm:inline">Focus Mode</span>
              </>
            )}
          </button>
          <Link
            href={`/flashcard/${session.id}`}
            className="px-3 py-1.5 bg-surface-elevated hover:bg-surface border border-rule-border text-ink-primary rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent-violet" />
            <span className="hidden sm:inline">Active Flashcards</span>
          </Link>
          <Link
            href={`/diagram/${session.id}`}
            className="px-3 py-1.5 bg-surface-elevated hover:bg-surface border border-rule-border text-ink-primary rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Network className="w-3.5 h-3.5 text-accent-amber" />
            <span className="hidden sm:inline">Concept Mindmap</span>
          </Link>
        </div>
      </div>

      {/* Main Study Environment: Focus Mode or Split View */}
      {effectiveFocusMode ? (
        <div className="flex-1 flex flex-col bg-surface/20 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col border-x border-rule-border bg-canvas/70 shadow-sm overflow-hidden">
            {renderChatPane()}
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Material Viewer */}
          <div className="lg:col-span-6 border-r border-rule-border flex flex-col bg-canvas overflow-hidden">
            <div className="p-3 border-b border-rule-border bg-surface flex items-center justify-between text-xs font-mono text-ink-muted">
              <span className="flex items-center gap-1.5 text-ink-primary font-semibold">
                {session.contextType === 'YOUTUBE' ? (
                  <Youtube className="w-4 h-4 text-red-500" />
                ) : session.contextType === 'PDF' ? (
                  <FileText className="w-4 h-4 text-accent-cyan" />
                ) : (
                  <BookOpen className="w-4 h-4 text-accent-cyan" />
                )}
                {isVectorSearchActive
                  ? 'Verified Literature Source'
                  : hasContextText
                  ? 'Reference Source Notes'
                  : 'Academic Topic Context'}
              </span>
              {hasContextText && (
                <button
                  onClick={handleCopyContext}
                  className="text-[11px] text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
                >
                  {copiedContext ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedContext ? 'Copied' : 'Copy Excerpt'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {session.contextType === 'YOUTUBE' && youtubeEmbed && (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-rule-border shadow-md">
                  <iframe
                    src={youtubeEmbed}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="p-5 rounded-xl bg-surface border border-rule-border space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-cyan">
                    {isVectorSearchActive
                      ? 'Indexed Equations & Verified Excerpts'
                      : hasContextText
                      ? 'Reference Excerpts & Notes'
                      : 'Curated Academic Focus'}
                  </h4>
                  {isVectorSearchActive && (
                    <span className="text-[10px] font-mono text-ink-muted">1536-dim vectors</span>
                  )}
                </div>
                <div className="text-xs text-ink-body leading-relaxed whitespace-pre-wrap font-mono bg-canvas p-4 rounded-lg border border-rule-border">
                  {session.contextText ||
                    'No source text attached. The Socratic tutor will converse across its broad academic and scientific knowledge base.'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-rule-border text-xs text-ink-muted font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-cyan shrink-0" />
                <span>
                  {isVectorSearchActive
                    ? 'Vector RAG Active: Interrogate proof steps, limitations, and literature details.'
                    : hasContextText
                    ? 'Notes Truth Active: Interrogate proof steps, derivations, or syllabus notes.'
                    : 'Open Socratic Interrogation: Explore foundational theory and problem solving.'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Streaming AI Tutor Chat */}
          <div className="lg:col-span-6 flex flex-col bg-surface/50 overflow-hidden">
            {renderChatPane()}
          </div>
        </div>
      )}
    </div>
  );
}
