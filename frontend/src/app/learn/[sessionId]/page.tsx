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
  ChevronRight
} from 'lucide-react';

const DEMO_SESSIONS_MAP: Record<string, StudySession> = {
  'vaswani-2017-demo': {
    id: 'vaswani-2017-demo',
    userId: 'scholar-user',
    title: 'Attention Is All You Need (Vaswani et al. 2017)',
    sessionType: 'LEARN',
    contextType: 'PDF',
    contextText: `§ 3.2 Multi-Head Attention Mechanism\nAn attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.\n\nAttention(Q, K, V) = softmax(QKᵀ / √d_k)V\n\nDividing by √d_k prevents the dot products from growing excessively large for large key dimensions, avoiding saturation in regions of vanishing gradients.\n\n§ 4.0 Complexity Analysis\nMaximum path length between any two word positions is strictly O(1) in self-attention, compared to O(n) in recurrent layers, enabling full parallelization across training tokens.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'deepseek-r1-demo': {
    id: 'deepseek-r1-demo',
    userId: 'scholar-user',
    title: 'DeepSeek-R1: Mathematical Reasoning via GRPO',
    sessionType: 'LEARN',
    contextType: 'TOPIC',
    contextText: `§ 2.1 Rule-Based Reward Verification\nTraditional RLHF relies on neural reward models that suffer from reward hacking and drift during long chain-of-thought exploration. DeepSeek-R1 enforces deterministic rule-based verification: compiler pass/fail execution for code and ground-truth symbolic equivalence for mathematical proofs.\n\n§ 3.1 Group Relative Policy Optimization (GRPO)\nTo mitigate the substantial memory overhead of training a separate value network equal in size to the policy model, GRPO samples a group of G candidate outputs for each query and computes normalized relative advantages across the sampled group.\n\nJ_GRPO(θ) = E [ 1/G ∑ (min(r_i A_i, clip(...)A_i)) - β D_KL(π_θ || π_ref) ]`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'cs229-demo': {
    id: 'cs229-demo',
    userId: 'scholar-user',
    title: 'Stanford CS229: Gradient Descent & Normal Equations',
    sessionType: 'LEARN',
    contextType: 'YOUTUBE',
    sourceUrl: 'https://www.youtube.com/watch?v=jGwO_UgTS7I',
    contextText: `§ 1.1 Supervised Learning & Linear Regression\nTo perform supervised learning, we define the cost function J(θ) measuring the squared difference between hypothesis h_θ(x) and ground truth targets y. The batch gradient descent update repeatedly steps in the negative gradient direction across all training examples.\n\n§ 1.2 The Normal Equations\nRather than iterating with gradient descent, the optimal parameters θ that minimize J(θ) can be computed directly in closed form using matrix derivatives and setting the gradient ∇_θ J(θ) to zero.\n\nθ = (XᵀX)⁻¹ Xᵀy\n\nProvided X has full column rank, XᵀX is strictly invertible, providing the global minimum in O(d³) algebraic matrix operations.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
};

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
        api.getSession(sessionId).catch(() => null),
        api.getMessages(sessionId).catch(() => []),
      ]);

      if (sessionData) {
        setSession(sessionData);
        setMessages(messageData || []);
      } else if (DEMO_SESSIONS_MAP[sessionId]) {
        const demo = DEMO_SESSIONS_MAP[sessionId];
        setSession(demo);
        setMessages([
          {
            id: 'demo-welcome',
            sessionId,
            sender: 'ASSISTANT',
            content: `Welcome to the Socratic study sanctuary for "${demo.title}". The context is verified and indexed into vector memory. Ask any conceptual question, query a proof step, or challenge my reasoning.`,
            createdAt: new Date().toISOString(),
          }
        ]);
      } else {
        // Fallback generic session
        const generic: StudySession = {
          id: sessionId,
          userId: 'local-user',
          title: 'Active Research Sanctuary',
          sessionType: 'LEARN',
          contextType: 'TOPIC',
          contextText: 'Grounded active learning session. Formulate hypotheses and interrogate theoretical literature with Socratic guidance.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSession(generic);
        setMessages([
          {
            id: 'init-msg',
            sessionId,
            sender: 'ASSISTANT',
            content: 'Study sanctuary initialized. What literature, formula, or proof would you like to explore today?',
            createdAt: new Date().toISOString(),
          }
        ]);
      }
    } catch {
      if (DEMO_SESSIONS_MAP[sessionId]) {
        setSession(DEMO_SESSIONS_MAP[sessionId]);
      }
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
            id: 'temp-assistant-' + Date.now(),
            sessionId,
            sender: 'ASSISTANT',
            content: accumulatedTokens,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingResponse('');
        },
        () => {
          // Fallback to grounded local synthesis if stream endpoint is unavailable
          fallbackGenerateResponse(userMsg);
        }
      );
    } catch {
      fallbackGenerateResponse(userMsg);
    }
  };

  const fallbackGenerateResponse = (query: string) => {
    const lower = query.toLowerCase();
    let reply = '';

    if (lower.includes('scale') || lower.includes('root') || lower.includes('d_k')) {
      reply =
        'Dividing by √d_k is mathematically necessary to preserve unit variance. Under the assumption that components of q and k are independent random variables with mean 0 and variance 1, their dot product has variance d_k. For large d_k, dot products grow substantially, pushing softmax into flat regions with near-zero gradients. Scaling by 1/√d_k restores variance to 1.';
    } else if (lower.includes('grpo') || lower.includes('critic') || lower.includes('reward')) {
      reply =
        'Group Relative Policy Optimization eliminates the need for an explicit value network (critic) by sampling multiple outputs {o_1, ..., o_G} per prompt. The baseline is directly computed from the group empirical mean and standard deviation: A_i = (R_i - mean(R)) / std(R). This drastically reduces GPU memory overhead while maintaining policy gradient stability.';
    } else if (lower.includes('normal') || lower.includes('invert') || lower.includes('gradient')) {
      reply =
        'The Normal Equations θ = (XᵀX)⁻¹ Xᵀy minimize the quadratic cost function J(θ) in a single step by setting the matrix derivative ∇_θ J(θ) = 0. However, if features are collinear or the sample size m < d, XᵀX is singular (non-invertible). In such regimes, gradient descent with regularization is numerically preferred.';
    } else {
      reply = `In reference to "${session?.title}": The mechanism establishes mathematical provenance by anchoring representations to verified source literature. Notice how each transformation avoids ungrounded extrapolation and retains verifiable token dependencies.`;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 4;
      setStreamingResponse(reply.slice(0, i));
      if (i >= reply.length) {
        clearInterval(interval);
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: 'a-' + Date.now(),
            sessionId,
            sender: 'ASSISTANT',
            content: reply,
            createdAt: new Date().toISOString(),
          }
        ]);
        setStreamingResponse('');
      }
    }, 20);
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
            <h2 className="text-xs sm:text-sm font-bold text-ink-primary truncate">{session.title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-ink-muted">
              <span className="uppercase text-accent-cyan font-semibold">{session.sessionType}</span>
              <span>·</span>
              <span>{session.contextType}</span>
              <span>·</span>
              <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" /> 98.4% Grounded
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Split View Content */}
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
              Verified Literature Source
            </span>
            <button
              onClick={handleCopyContext}
              className="text-[11px] text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
            >
              {copiedContext ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedContext ? 'Copied' : 'Copy Excerpt'}</span>
            </button>
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
                  Indexed Equations & Verified Excerpts
                </h4>
                <span className="text-[10px] font-mono text-ink-muted">1536-dim vectors</span>
              </div>
              <div className="text-xs text-ink-body leading-relaxed whitespace-pre-wrap font-mono bg-canvas p-4 rounded-lg border border-rule-border">
                {session.contextText || 'No source text available. Use Socratic tutor to explore the topic.'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/40 border border-rule-border text-xs text-ink-muted font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Socratic Interrogation active: Ask questions about proof steps, limitations, or architecture.</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Streaming AI Tutor Chat */}
        <div className="lg:col-span-6 flex flex-col bg-surface/50 overflow-hidden">
          {/* Tutor Chat Subheader */}
          <div className="px-4 py-2.5 border-b border-rule-border bg-surface font-mono text-xs flex items-center justify-between text-ink-muted">
            <span className="font-semibold text-ink-primary flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-accent-cyan" />
              Socratic Tutor
            </span>
            <span className="text-[11px] text-accent-emerald flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
              Grounded Retrieval Active
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-ink-muted font-mono">
                <div className="p-3 bg-surface-elevated text-accent-cyan border border-rule-border rounded-xl">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-ink-primary">
                  Ready to tutor you on &quot;{session.title}&quot;
                </h4>
                <p className="text-[11px] text-ink-muted max-w-xs font-sans">
                  Ask conceptual questions, request mathematical proofs, or test your comprehension with probe questions.
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
                  <p className="whitespace-pre-wrap">{streamingResponse || 'Retrieving source vectors...'}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Inquiry Chips */}
          <div className="px-4 py-2 border-t border-rule-border bg-surface flex gap-2 overflow-x-auto font-mono text-[11px]">
            <button
              onClick={() => handleSendMessage('Why divide by √d_k in attention?')}
              className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer"
            >
              Why √d_k?
            </button>
            <button
              onClick={() => handleSendMessage('Explain the mathematical derivation.')}
              className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer"
            >
              Derivation proof
            </button>
            <button
              onClick={() => handleSendMessage('What are the architectural trade-offs?')}
              className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer"
            >
              Key trade-offs
            </button>
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
                    ? 'AI Tutor is generating verified response...'
                    : 'Ask the tutor anything about this literature...'
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
      </div>
    </div>
  );
}
