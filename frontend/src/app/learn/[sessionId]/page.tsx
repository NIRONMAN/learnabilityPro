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
  BookOpen
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.push('/');
      return;
    }
    loadData();
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
      setMessages(messageData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;

    const userMsg = inputText.trim();
    setInputText('');

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
          id: 'temp-assistant-' + Date.now(),
          sessionId,
          sender: 'ASSISTANT',
          content: accumulatedTokens,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingResponse('');
      },
      (err) => {
        console.error('SSE Stream error:', err);
        setIsStreaming(false);
        const errorMessage: ChatMessage = {
          id: 'temp-err-' + Date.now(),
          sessionId,
          sender: 'ASSISTANT',
          content: 'Sorry, I encountered an issue retrieving the response. Please try again.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingResponse('');
      }
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading study workspace...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <p>Session not found.</p>
        <Link href="/dashboard" className="text-indigo-400 underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const youtubeEmbed = getYouTubeEmbedUrl(session.sourceUrl);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Workspace Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-white line-clamp-1">{session.title}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="uppercase text-indigo-400 font-semibold">{session.sessionType}</span>
              <span>•</span>
              <span>{session.contextType}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/flashcard/${session.id}`}
            className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            Active Flashcards
          </Link>
          <Link
            href={`/diagram/${session.id}`}
            className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Concept Mindmap
          </Link>
        </div>
      </div>

      {/* Split View Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Panel: Material Viewer */}
        <div className="lg:col-span-6 border-r border-slate-800 flex flex-col bg-slate-950 overflow-hidden">
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              {session.contextType === 'YOUTUBE' ? (
                <Youtube className="w-4 h-4 text-red-500" />
              ) : session.contextType === 'PDF' ? (
                <FileText className="w-4 h-4 text-rose-400" />
              ) : (
                <BookOpen className="w-4 h-4 text-indigo-400" />
              )}
              Study Reference Material
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {session.contextType === 'YOUTUBE' && youtubeEmbed ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl">
                <iframe
                  src={youtubeEmbed}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Extracted Context & Notes
              </h4>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-xl border border-slate-850">
                {session.contextText || 'No direct text context provided. Ask questions to explore the subject.'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Streaming AI Tutor Chat */}
        <div className="lg:col-span-6 flex flex-col bg-slate-900/30 overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
                <div className="p-3 bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 rounded-xl">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">
                  Ready to tutor you on &quot;{session.title}&quot;
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Ask conceptual questions, request explanations, or test your understanding with Socratic questioning.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'USER' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ASSISTANT' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'USER'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.sender === 'USER' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* In-flight streaming response token bubble */}
            {isStreaming && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed bg-slate-900 border border-indigo-800/60 text-slate-200 shadow-lg shadow-indigo-950/50">
                  <p className="whitespace-pre-wrap">{streamingResponse || 'Thinking...'}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                disabled={isStreaming}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isStreaming
                    ? 'AI Tutor is generating response...'
                    : 'Ask the tutor anything about this topic...'
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isStreaming}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
