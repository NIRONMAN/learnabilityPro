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
  FolderOpen
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

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

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.push('/');
      return;
    }
    loadSessions();
  }, [router]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.listSessions();
      setSessions(data);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) {
        authStorage.removeToken();
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (modalMode === 'PDF') {
        if (!selectedFile) throw new Error('Please select a PDF file');
        await api.uploadPdf(selectedFile);
      } else if (modalMode === 'YOUTUBE') {
        if (!youtubeUrl) throw new Error('Please enter a YouTube URL');
        await api.ingestYouTube({ url: youtubeUrl, title: newTitle });
      } else {
        await api.createSession({
          title: newTitle,
          sessionType,
          contextType: 'TOPIC',
          contextText,
        });
      }

      setShowModal(false);
      resetModal();
      await loadSessions();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study session?')) return;
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
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

  const filteredSessions = sessions.filter((s) =>
    filterType === 'ALL' ? true : s.sessionType === filterType
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Study Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your AI-powered active learning workspaces and review past study materials
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Study Session
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Sessions</div>
          <div className="text-2xl font-bold text-white">{sessions.length}</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-indigo-400 font-medium">Tutor Sessions</div>
          <div className="text-2xl font-bold text-white">
            {sessions.filter((s) => s.sessionType === 'LEARN' || s.sessionType === 'REVISE').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-purple-400 font-medium">Flashcard Decks</div>
          <div className="text-2xl font-bold text-white">
            {sessions.filter((s) => s.sessionType === 'FLASHCARD').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-amber-400 font-medium">Concept Maps</div>
          <div className="text-2xl font-bold text-white">
            {sessions.filter((s) => s.sessionType === 'DIAGRAM').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {['ALL', 'LEARN', 'REVISE', 'FLASHCARD', 'DIAGRAM'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterType === tab
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            {tab === 'ALL' ? 'All Sessions' : tab}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="p-3 bg-slate-900 text-slate-500 rounded-xl">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No study sessions found</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Get started by ingesting a study material or creating an interactive tutoring session.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between group space-y-4 shadow-lg hover:shadow-indigo-500/5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                      session.sessionType === 'LEARN'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : session.sessionType === 'FLASHCARD'
                        ? 'bg-purple-950 text-purple-400 border border-purple-800/60'
                        : session.sessionType === 'DIAGRAM'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-800/60'
                    }`}
                  >
                    {session.sessionType}
                  </span>

                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {session.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    {session.contextType === 'PDF' ? (
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                    ) : session.contextType === 'YOUTUBE' ? (
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{session.contextType}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(session.updatedAt || session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {session.contextText && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {session.contextText}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/learn/${session.id}`}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Open Tutor Chat"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/flashcard/${session.id}`}
                    className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Open Flashcards"
                  >
                    <BrainCircuit className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/diagram/${session.id}`}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Open Mindmap"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Link>
                </div>

                <Link
                  href={`/learn/${session.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Resume <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Study Session Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create Study Session</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-200 text-xs rounded-lg">
                {modalError}
              </div>
            )}

            {/* Ingestion Mode Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setModalMode('TOPIC')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  modalMode === 'TOPIC'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Direct Topic
              </button>
              <button
                type="button"
                onClick={() => setModalMode('PDF')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  modalMode === 'PDF'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setModalMode('YOUTUBE')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  modalMode === 'YOUTUBE'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                YouTube URL
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {modalMode === 'PDF' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select PDF Document
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Spring AI ETL will extract text pages, split tokens, and index embeddings into pgvector.
                  </p>
                </div>
              ) : modalMode === 'YOUTUBE' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      YouTube Lecture Video URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Custom Session Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems Lecture 4"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Session Subject or Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Backpropagation in Neural Networks"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Primary Mode
                      </label>
                      <select
                        value={sessionType}
                        onChange={(e) => setSessionType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="LEARN">Interactive Tutor (LEARN)</option>
                        <option value="REVISE">Active Recall (REVISE)</option>
                        <option value="FLASHCARD">Flashcard Deck</option>
                        <option value="DIAGRAM">Mermaid Concept Map</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Notes / Key Context (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Paste syllabus, textbook excerpts, or discussion notes..."
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {submitting ? 'Ingesting...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
