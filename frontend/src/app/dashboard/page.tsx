'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, StudySession } from '@/lib/api';
import {
  BookOpen,
  BrainCircuit,
  Sparkles,
  Plus,
  FileText,
  Youtube,
  Trash2,
  Clock,
  ArrowRight,
  UploadCloud,
  LogOut,
  FolderOpen,
  ShieldCheck,
  Network,
  RotateCcw,
  GraduationCap,
  X,
  Search,
  Filter
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'TOPIC' | 'PDF' | 'YOUTUBE'>('TOPIC');
  const [newTitle, setNewTitle] = useState('');
  const [sessionType, setSessionType] = useState<'LEARN' | 'REVISE' | 'FLASHCARD' | 'DIAGRAM'>('LEARN');
  const [contextText, setContextText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Strong Authentication Gate: Non-authenticated users are redirected back to landing page
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.replace('/?auth=login');
      return;
    }
    api.getMe()
      .then((user) => {
        setCurrentUser(user);
        loadSessions();
      })
      .catch(() => {
        authStorage.removeToken();
        router.replace('/?auth=login');
      });
  }, [router]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.listSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const trimmedTitle = newTitle.trim();

      if (modalMode === 'PDF') {
        if (!selectedFile) throw new Error('Please select a PDF file to upload');
        const resolvedTitle =
          trimmedTitle || (selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '').trim() : 'PDF Study Session');

        if (trimmedTitle || sessionType !== 'LEARN') {
          const created = await api.createSession({
            title: resolvedTitle,
            sessionType,
            contextType: 'PDF',
            sourceUrl: selectedFile.name,
          });
          await api.uploadPdf(selectedFile, created.id);
        } else {
          await api.uploadPdf(selectedFile);
        }
      } else if (modalMode === 'YOUTUBE') {
        if (!youtubeUrl.trim()) throw new Error('Please enter a valid YouTube URL');
        const resolvedTitle = trimmedTitle || 'YouTube Study Session';
        await api.ingestYouTube({ url: youtubeUrl.trim(), title: resolvedTitle });
      } else {
        let resolvedTitle = trimmedTitle;
        if (!resolvedTitle) {
          const firstLine = contextText.trim().split('\n')[0]?.trim();
          resolvedTitle = (firstLine ? firstLine.slice(0, 40).trim() : '') || 'Generalized Study Session';
        }
        await api.createSession({
          title: resolvedTitle,
          sessionType,
          contextType: 'TOPIC',
          contextText: contextText.trim() || undefined,
        });
      }

      setShowModal(false);
      resetModal();
      await loadSessions();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create session on server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitializeStarter = async (starterType: 'vaswani' | 'deepseek' | 'cs229') => {
    try {
      setLoading(true);
      if (starterType === 'vaswani') {
        await api.createSession({
          title: 'Attention Is All You Need (Vaswani et al. 2017)',
          sessionType: 'LEARN',
          contextType: 'PDF',
          contextText: '§ 3.2 Multi-Head Attention Mechanism\nAn attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.\n\nAttention(Q, K, V) = softmax(QKᵀ / √d_k)V\n\nDividing by √d_k prevents the dot products from growing excessively large for large key dimensions, avoiding saturation in regions of vanishing gradients.\n\n§ 4.0 Complexity Analysis\nMaximum path length between any two word positions is strictly O(1) in self-attention, compared to O(n) in recurrent layers, enabling full parallelization across training tokens.'
        });
      } else if (starterType === 'deepseek') {
        await api.createSession({
          title: 'DeepSeek-R1: Mathematical Reasoning via GRPO',
          sessionType: 'FLASHCARD',
          contextType: 'TOPIC',
          contextText: '§ 2.1 Rule-Based Reward Verification\nTraditional RLHF relies on neural reward models that suffer from reward hacking and drift during long chain-of-thought exploration. DeepSeek-R1 enforces deterministic rule-based verification: compiler pass/fail execution for code and ground-truth symbolic equivalence for mathematical proofs.\n\n§ 3.1 Group Relative Policy Optimization (GRPO)\nTo mitigate the substantial memory overhead of training a separate value network equal in size to the policy model, GRPO samples a group of G candidate outputs for each query and computes normalized relative advantages across the sampled group.\n\nJ_GRPO(θ) = E [ 1/G ∑ (min(r_i A_i, clip(...)A_i)) - β D_KL(π_θ || π_ref) ]'
        });
      } else if (starterType === 'cs229') {
        await api.createSession({
          title: 'Stanford CS229: Gradient Descent & Normal Equations',
          sessionType: 'DIAGRAM',
          contextType: 'YOUTUBE',
          sourceUrl: 'https://www.youtube.com/watch?v=jGwO_UgTS7I',
          contextText: '§ 1.1 Supervised Learning & Linear Regression\nTo perform supervised learning, we define the cost function J(θ) measuring the squared difference between hypothesis h_θ(x) and ground truth targets y. The batch gradient descent update repeatedly steps in the negative gradient direction across all training examples.\n\n§ 1.2 The Normal Equations\nRather than iterating with gradient descent, the optimal parameters θ that minimize J(θ) can be computed directly in closed form using matrix derivatives and setting the gradient ∇_θ J(θ) to zero.\n\nθ = (XᵀX)⁻¹ Xᵀy\n\nProvided X has full column rank, XᵀX is strictly invertible, providing the global minimum in O(d³) algebraic matrix operations.'
        });
      }
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to initialize starter:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this study session from your workspace?')) return;
    try {
      await api.deleteSession(id).catch(() => {});
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const resetModal = () => {
    setNewTitle('');
    setContextText('');
    setYoutubeUrl('');
    setSelectedFile(null);
    setModalError(null);
  };

  const handleLogout = () => {
    authStorage.removeToken();
    router.push('/');
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesFilter = filterType === 'ALL' ? true : s.sessionType === filterType;
    const titleText = s.title || '';
    const matchesSearch = searchQuery
      ? titleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contextText && s.contextText.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-8 font-sans">
      {/* Top Banner / Academic Workspace Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rule-border">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-rule-border bg-surface-elevated text-xs font-mono text-ink-muted mb-2">
            <span className="w-2 h-2 rounded-full bg-accent-emerald"></span>
            <span className="text-ink-primary font-medium">Scholar Workspace</span>
            <span className="text-rule-strong">·</span>
            <span className="text-accent-cyan">Active Ingestion Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            Study Sanctuaries & Literature Index
          </h1>
          <p className="text-xs sm:text-sm text-ink-body mt-1">
            Grounded multimodal learning environments: Socratic interrogation, visual concept hierarchies, and Leitner recall.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 font-bold rounded-lg flex items-center gap-2 shadow-sm shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Study Session</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 text-ink-muted hover:text-ink-primary border border-rule-border rounded-lg bg-surface hover:bg-surface-elevated transition-colors cursor-pointer"
            title="Log Out of Scholar Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Telemetry Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-surface border border-rule-border rounded-xl space-y-1">
          <div className="text-[11px] text-ink-muted uppercase font-semibold">Active Sessions</div>
          <div className="text-2xl font-bold text-ink-primary">{sessions.length}</div>
          <div className="text-[10px] text-accent-cyan">Curated knowledge corpus</div>
        </div>
        <div className="p-4 bg-surface border border-rule-border rounded-xl space-y-1">
          <div className="text-[11px] text-accent-cyan uppercase font-semibold">Socratic Tutors</div>
          <div className="text-2xl font-bold text-ink-primary">
            {sessions.filter((s) => s.sessionType === 'LEARN' || s.sessionType === 'REVISE').length}
          </div>
          <div className="text-[10px] text-ink-muted">Strict mathematical proofing</div>
        </div>
        <div className="p-4 bg-surface border border-rule-border rounded-xl space-y-1">
          <div className="text-[11px] text-accent-violet uppercase font-semibold">Leitner Decks</div>
          <div className="text-2xl font-bold text-ink-primary">
            {sessions.filter((s) => s.sessionType === 'FLASHCARD').length}
          </div>
          <div className="text-[10px] text-ink-muted">4-box interval scheduling</div>
        </div>
        <div className="p-4 bg-surface border border-rule-border rounded-xl space-y-1">
          <div className="text-[11px] text-accent-amber uppercase font-semibold">Concept Mindmaps</div>
          <div className="text-2xl font-bold text-ink-primary">
            {sessions.filter((s) => s.sessionType === 'DIAGRAM').length}
          </div>
          <div className="text-[10px] text-ink-muted">Mermaid directed acyclic graphs</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
          {[
            { id: 'ALL', label: 'All Sanctuaries' },
            { id: 'LEARN', label: 'Socratic Tutor' },
            { id: 'FLASHCARD', label: 'Active Recall' },
            { id: 'DIAGRAM', label: 'Concept Tree' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-accent-cyan text-slate-950 font-bold shadow-sm'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-elevated'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative font-mono text-xs">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sessions..."
            className="pl-8 pr-3 py-1.5 bg-surface border border-rule-border rounded-lg text-ink-primary text-xs focus:outline-none focus:border-accent-cyan placeholder:text-ink-subtle w-full sm:w-60"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-20 text-center text-ink-muted text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse inline-block mr-2"></span>
          Indexing study sanctuaries...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-16 border border-dashed border-rule-border rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4 bg-surface/30 font-sans">
          <div className="p-3 bg-surface-elevated text-ink-muted rounded-xl border border-rule-border">
            <FolderOpen className="w-8 h-8 text-accent-cyan" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink-primary font-mono">No study sanctuaries found</h3>
            <p className="text-xs text-ink-body max-w-sm mt-1">
              Create your own custom session or initialize a curated research sanctuary directly into your database.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-accent-cyan text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer shadow-sm"
            >
              + Create Custom Sanctuary
            </button>
            <button
              onClick={() => handleInitializeStarter('vaswani')}
              className="px-3.5 py-2 border border-rule-border bg-surface hover:bg-surface-elevated text-ink-primary rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              + Add Attention (Vaswani 2017)
            </button>
            <button
              onClick={() => handleInitializeStarter('deepseek')}
              className="px-3.5 py-2 border border-rule-border bg-surface hover:bg-surface-elevated text-ink-primary rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              + Add DeepSeek-R1 (GRPO)
            </button>
            <button
              onClick={() => handleInitializeStarter('cs229')}
              className="px-3.5 py-2 border border-rule-border bg-surface hover:bg-surface-elevated text-ink-primary rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              + Add CS229 (Optimization)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-surface border border-rule-border hover:border-rule-strong rounded-xl p-5 transition-all flex flex-col justify-between group space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      session.sessionType === 'LEARN'
                        ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                        : session.sessionType === 'FLASHCARD'
                        ? 'bg-accent-violet/10 text-accent-violet border border-accent-violet/20'
                        : session.sessionType === 'DIAGRAM'
                        ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
                        : 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                    }`}
                  >
                    {session.sessionType === 'LEARN'
                      ? 'Socratic Tutor'
                      : session.sessionType === 'FLASHCARD'
                      ? 'Leitner Deck'
                      : session.sessionType === 'DIAGRAM'
                      ? 'Concept DAG'
                      : session.sessionType}
                  </span>

                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="text-ink-subtle hover:text-red-400 transition-colors p-1 cursor-pointer"
                    title="Delete Sanctuary"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-ink-primary group-hover:text-accent-cyan transition-colors line-clamp-2 leading-snug">
                    {session.title || 'Untitled Session'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-muted mt-2">
                    {session.contextType === 'PDF' ? (
                      <FileText className="w-3.5 h-3.5 text-accent-cyan" />
                    ) : session.contextType === 'YOUTUBE' ? (
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
                    )}
                    <span>{session.contextType}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3 text-ink-subtle" />
                    <span>{new Date(session.updatedAt || session.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                {session.contextText && (
                  <p className="text-xs text-ink-body line-clamp-2 leading-relaxed">
                    {session.contextText}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-rule-border flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/learn/${session.id}`}
                    className="p-1.5 text-ink-muted hover:text-accent-cyan hover:bg-surface-elevated rounded-md transition-colors"
                    title="Open Socratic Tutor"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/flashcard/${session.id}`}
                    className="p-1.5 text-ink-muted hover:text-accent-violet hover:bg-surface-elevated rounded-md transition-colors"
                    title="Open Leitner Deck"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/diagram/${session.id}`}
                    className="p-1.5 text-ink-muted hover:text-accent-amber hover:bg-surface-elevated rounded-md transition-colors"
                    title="Open Concept DAG"
                  >
                    <Network className="w-4 h-4" />
                  </Link>
                </div>

                <Link
                  href={`/learn/${session.id}`}
                  className="px-2.5 py-1 text-xs font-semibold text-accent-cyan hover:underline flex items-center gap-1"
                >
                  <span>Study</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Study Session Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-rule-border rounded-xl max-w-lg w-full p-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-rule-border mb-4">
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent-cyan" />
                Initialize Study Sanctuary
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-ink-muted hover:text-ink-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Mode Tabs */}
            <div className="flex rounded-lg border border-rule-border p-1 bg-surface-elevated mb-4">
              <button
                type="button"
                onClick={() => setModalMode('TOPIC')}
                className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                  modalMode === 'TOPIC' ? 'bg-canvas text-accent-cyan font-bold' : 'text-ink-muted'
                }`}
              >
                Raw Notes / Topic
              </button>
              <button
                type="button"
                onClick={() => setModalMode('PDF')}
                className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                  modalMode === 'PDF' ? 'bg-canvas text-accent-cyan font-bold' : 'text-ink-muted'
                }`}
              >
                PDF Paper
              </button>
              <button
                type="button"
                onClick={() => setModalMode('YOUTUBE')}
                className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                  modalMode === 'YOUTUBE' ? 'bg-canvas text-accent-cyan font-bold' : 'text-ink-muted'
                }`}
              >
                Video Lecture
              </button>
            </div>

            {/* In Raw Notes / Topic mode: helpful banner */}
            {modalMode === 'TOPIC' && (
              <div className="p-3 mb-4 rounded-lg bg-surface-elevated border border-rule-border text-xs text-ink-body leading-relaxed font-sans flex items-start gap-2">
                <span className="shrink-0 text-sm">💡</span>
                <span>
                  Starting without notes will launch a generalized study chat using the tutor&apos;s broad knowledge base. If you include notes or references, the tutor will strictly treat them as the source of truth.
                </span>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              {modalError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-[11px] text-ink-muted mb-1 uppercase font-semibold">
                  Sanctuary Title <span className="text-[10px] text-ink-subtle normal-case font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="block text-[11px] text-ink-muted mb-1 uppercase font-semibold">
                  Study Modality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionType('LEARN')}
                    className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                      sessionType === 'LEARN'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan font-bold'
                        : 'border-rule-border bg-canvas text-ink-muted'
                    }`}
                  >
                    Socratic Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType('FLASHCARD')}
                    className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                      sessionType === 'FLASHCARD'
                        ? 'border-accent-violet bg-accent-violet/10 text-accent-violet font-bold'
                        : 'border-rule-border bg-canvas text-ink-muted'
                    }`}
                  >
                    Leitner Deck
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType('DIAGRAM')}
                    className={`p-2 rounded border text-center transition-colors cursor-pointer ${
                      sessionType === 'DIAGRAM'
                        ? 'border-accent-amber bg-accent-amber/10 text-accent-amber font-bold'
                        : 'border-rule-border bg-canvas text-ink-muted'
                    }`}
                  >
                    Concept Tree
                  </button>
                </div>
              </div>

              {modalMode === 'PDF' && (
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1 uppercase font-semibold">
                    Upload Research PDF <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-rule-border file:bg-surface-elevated file:text-ink-primary cursor-pointer"
                  />
                </div>
              )}

              {modalMode === 'YOUTUBE' && (
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1 uppercase font-semibold">
                    YouTube Lecture URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-ink-muted mb-1 uppercase font-semibold">
                  {modalMode === 'TOPIC' ? 'Notes or Excerpt (Optional)' : 'Source Notes or Excerpt'}
                </label>
                <textarea
                  rows={3}
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder={
                    modalMode === 'TOPIC'
                      ? 'Paste notes, formulas, or leave blank to study with open knowledge base...'
                      : 'Paste mathematical formulas, excerpts, or syllabus guidelines...'
                  }
                  className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rule-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-md border border-rule-border text-ink-muted hover:bg-surface-elevated cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Indexing Material...' : 'Initialize Sanctuary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
