'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Youtube,
  BookOpen,
  Copy,
  Check,
  Search,
  ExternalLink,
  Quote,
  Sparkles,
  Play,
  RotateCcw,
  FileCode,
  Download,
  Eye,
  Maximize2,
  X,
  Clock,
  Layers
} from 'lucide-react';
import { StudySession } from '@/lib/api';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export interface SourceMaterialViewerProps {
  session: StudySession;
  hasPdfFile: boolean;
  pdfUrl: string;
  onCiteText: (quoteText: string, reference?: string) => void;
  onAskTutor?: (question: string) => void;
  youtubeStartSec?: number | null;
  onSeekVideo?: (seconds: number) => void;
  onClose?: () => void;
  className?: string;
}

interface TranscriptSegment {
  timestamp?: string;
  seconds?: number;
  text: string;
}

export function SourceMaterialViewer({
  session,
  hasPdfFile,
  pdfUrl,
  onCiteText,
  onAskTutor,
  youtubeStartSec,
  onSeekVideo,
  onClose,
  className = '',
}: SourceMaterialViewerProps) {
  // Tab/view mode within material panel
  const [pdfSubView, setPdfSubView] = useState<'embed' | 'reader'>(hasPdfFile ? 'embed' : 'reader');
  const [youtubeSubView, setYoutubeSubView] = useState<'transcript' | 'summary'>('transcript');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedSegmentIdx, setCopiedSegmentIdx] = useState<number | null>(null);

  // Floating selection action state
  const [selectionAction, setSelectionAction] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // PDF blob URL state for same-origin iframe/object rendering
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch PDF as Blob URL to avoid cross-origin / X-Frame-Options blocking in Chromium
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (session.contextType === 'PDF' && hasPdfFile && pdfUrl) {
      setLoadingPdf(true);
      setPdfLoadError(null);

      fetch(pdfUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          setBlobPdfUrl(objectUrl);
          setLoadingPdf(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error('Failed to load PDF blob:', err);
          setPdfLoadError('Could not load PDF document directly.');
          setLoadingPdf(false);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [session.contextType, hasPdfFile, pdfUrl]);

  // If hasPdfFile updates, sync view mode
  useEffect(() => {
    if (hasPdfFile && pdfSubView === 'reader' && !session.contextText) {
      setPdfSubView('embed');
    } else if (!hasPdfFile && pdfSubView === 'embed') {
      setPdfSubView('reader');
    }
  }, [hasPdfFile, session.contextText, pdfSubView]);

  // Handle text selection inside source material
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionAction(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 5) {
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          // Position relative to container or viewport
          const x = Math.max(10, Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 220));
          const y = Math.max(10, rect.top - 46);
          setSelectionAction({ text, x, y });
        }
      } catch {
        setSelectionAction(null);
      }
    } else {
      setSelectionAction(null);
    }
  };

  const clearSelection = () => {
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCopyContext = () => {
    if (!session.contextText) return;
    navigator.clipboard.writeText(session.contextText);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  // YouTube embed helper
  const youtubeEmbedUrl = useMemo(() => {
    if (!session.sourceUrl) return null;
    const match = session.sourceUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return null;
    const videoId = match[1];
    const base = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    return youtubeStartSec ? `${base}&start=${youtubeStartSec}&autoplay=1` : base;
  }, [session.sourceUrl, youtubeStartSec]);

  // Parse transcript segments from contextText
  const parsedTranscript: TranscriptSegment[] = useMemo(() => {
    if (!session.contextText) return [];
    const lines = session.contextText.split('\n');
    const segments: TranscriptSegment[] = [];

    const tsRegex = /\[(\d{1,2}:\d{2})\]/;
    let currentSegment: TranscriptSegment | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip generic headers
      if (line.startsWith('YouTube Video:') || line.startsWith('### Lecture Summary') || line.startsWith('### Lecture Transcript')) {
        continue;
      }

      const match = line.match(tsRegex);
      if (match) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        const ts = match[1];
        const [min, sec] = ts.split(':').map(Number);
        const totalSec = min * 60 + sec;
        const textContent = line.replace(tsRegex, '').trim();
        currentSegment = {
          timestamp: ts,
          seconds: totalSec,
          text: textContent,
        };
      } else if (currentSegment) {
        currentSegment.text += ' ' + line;
      } else {
        // Line without timestamp before any timestamped line
        segments.push({
          text: line,
        });
      }
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }, [session.contextText]);

  // Filter transcript segments by search query
  const filteredTranscript = useMemo(() => {
    if (!searchQuery.trim()) return parsedTranscript;
    const q = searchQuery.toLowerCase();
    return parsedTranscript.filter((s) => s.text.toLowerCase().includes(q) || s.timestamp?.includes(q));
  }, [parsedTranscript, searchQuery]);

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`h-full flex flex-col bg-surface/50 border-r border-rule-border overflow-hidden select-text relative font-sans ${className}`}
    >
      {/* ========================================================= */}
      {/* SOURCE MATERIAL HEADER                                    */}
      {/* ========================================================= */}
      <div className="h-12 px-4 border-b border-rule-border bg-surface flex items-center justify-between shrink-0 font-mono text-xs z-10">
        <div className="flex items-center gap-2 min-w-0">
          {session.contextType === 'YOUTUBE' ? (
            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
          ) : session.contextType === 'PDF' ? (
            <FileText className="w-4 h-4 text-accent-cyan shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-accent-cyan shrink-0" />
          )}

          <span className="font-bold text-xs text-ink-primary truncate max-w-[160px] sm:max-w-xs" title={session.sourceUrl || session.title}>
            {session.sourceUrl || session.title || 'Source Material'}
          </span>

          {session.contextType === 'PDF' && hasPdfFile && (
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
              PDF Live
            </span>
          )}
        </div>

        {/* Action Controls & Sub-view Switchers */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* PDF View Toggle: Embed vs Reader */}
          {session.contextType === 'PDF' && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
              {hasPdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfSubView('embed')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    pdfSubView === 'embed'
                      ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                  title="View original PDF document"
                >
                  Document
                </button>
              )}
              <button
                type="button"
                onClick={() => setPdfSubView('reader')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  pdfSubView === 'reader'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="View formatted text with LaTeX formulas and quick citations"
              >
                Reader
              </button>
            </div>
          )}

          {/* YouTube View Toggle: Transcript vs Summary */}
          {session.contextType === 'YOUTUBE' && parsedTranscript.length > 0 && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-rule-border">
              <button
                type="button"
                onClick={() => setYoutubeSubView('transcript')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  youtubeSubView === 'transcript'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="View interactive timestamped lecture transcript"
              >
                Transcript
              </button>
              <button
                type="button"
                onClick={() => setYoutubeSubView('summary')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  youtubeSubView === 'summary'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="View lecture summary & core concepts"
              >
                Summary
              </button>
            </div>
          )}

          {/* External Link if applicable */}
          {session.sourceUrl && session.sourceUrl.startsWith('http') && (
            <a
              href={session.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-surface-elevated text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
              title="Open source in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close Panel Button if requested */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-elevated text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
              title="Hide source material panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK SEARCH & CITATION TOOLBAR                           */}
      {/* ========================================================= */}
      <div className="px-4 py-2 border-b border-rule-border/70 bg-surface/80 flex items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search material / citations..."
            className="w-full bg-canvas border border-rule-border rounded-md pl-8 pr-3 py-1 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-cyan"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session.contextText && (
            <button
              type="button"
              onClick={handleCopyContext}
              className="p-1.5 rounded-md hover:bg-surface-elevated border border-rule-border text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Copy entire text to clipboard"
            >
              {copiedContext ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedContext ? 'Copied' : 'Copy Text'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BODY CONTENT: YOUTUBE OR PDF OR ACADEMIC READER           */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* YOUTUBE MEDIA VIEW */}
        {session.contextType === 'YOUTUBE' && (
          <div className="space-y-4">
            {youtubeEmbedUrl ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-rule-border shadow-md bg-black shrink-0">
                <iframe
                  src={youtubeEmbedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-elevated border border-rule-border text-center text-xs text-ink-muted font-mono">
                <Youtube className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p>No valid YouTube video URL found for this session.</p>
              </div>
            )}

            {/* Sub-view: Transcript or Summary */}
            {youtubeSubView === 'transcript' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted px-1">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                    Lecture Transcript ({filteredTranscript.length} segments)
                  </span>
                  <span className="text-[10px]">Click timestamp to seek video · Select text to cite</span>
                </div>

                {filteredTranscript.length > 0 ? (
                  <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                    {filteredTranscript.map((segment, idx) => (
                      <div
                        key={idx}
                        className="group p-2.5 rounded-lg border border-rule-border bg-surface hover:bg-surface-elevated hover:border-accent-cyan/40 transition-all text-xs leading-relaxed space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          {segment.timestamp ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (segment.seconds !== undefined) {
                                  onSeekVideo?.(segment.seconds);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20 cursor-pointer transition-colors"
                              title={`Seek video to ${segment.timestamp}`}
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{segment.timestamp}</span>
                            </button>
                          ) : (
                            <span className="text-ink-muted text-[10px]">Segment #{idx + 1}</span>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                onCiteText(
                                  segment.text,
                                  segment.timestamp ? `Timestamp [${segment.timestamp}]` : undefined
                                );
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Quote this transcript segment in chat"
                            >
                              <Quote className="w-2.5 h-2.5" />
                              <span>Cite in Chat</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  segment.timestamp
                                    ? `[${segment.timestamp}] ${segment.text}`
                                    : segment.text
                                );
                                setCopiedSegmentIdx(idx);
                                setTimeout(() => setCopiedSegmentIdx(null), 1500);
                              }}
                              className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface transition-colors cursor-pointer"
                              title="Copy segment"
                            >
                              {copiedSegmentIdx === idx ? (
                                <Check className="w-3 h-3 text-accent-emerald" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-ink-body font-sans text-xs selection:bg-accent-cyan/30">
                          {segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface border border-rule-border text-center text-xs text-ink-muted font-mono">
                    {searchQuery ? `No segments match "${searchQuery}"` : 'Transcript is parsing or not available.'}
                  </div>
                )}
              </div>
            )}

            {youtubeSubView === 'summary' && session.contextText && (
              <div className="p-4 rounded-xl bg-surface border border-rule-border space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span className="font-bold text-accent-cyan">Lecture Summary & Core Insights</span>
                  <button
                    type="button"
                    onClick={() => onCiteText(session.contextText || '', 'Video Summary')}
                    className="text-accent-cyan hover:underline flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                  >
                    <Quote className="w-3 h-3" /> Cite Summary
                  </button>
                </div>
                <div className="text-xs text-ink-body font-sans leading-relaxed">
                  <MarkdownRenderer content={session.contextText} onTimestampClick={onSeekVideo} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PDF VIEW */}
        {session.contextType === 'PDF' && (
          <div className="h-full flex flex-col space-y-3">
            {/* Embed View */}
            {pdfSubView === 'embed' && hasPdfFile ? (
              <div className="flex-1 w-full min-h-[500px] h-full rounded-xl overflow-hidden border border-rule-border shadow-md bg-canvas relative flex flex-col">
                {loadingPdf ? (
                  <div className="flex-1 min-h-[540px] flex flex-col items-center justify-center text-xs font-mono text-ink-muted space-y-3 bg-surface">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"></span>
                    <span>Rendering PDF document in Chrome viewer...</span>
                  </div>
                ) : blobPdfUrl ? (
                  <object
                    data={blobPdfUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[540px] flex-1 border-0"
                  >
                    <iframe
                      src={blobPdfUrl}
                      className="w-full h-full min-h-[540px] border-0"
                      title="PDF Document"
                    />
                  </object>
                ) : (
                  <div className="flex-1 min-h-[540px] flex flex-col items-center justify-center text-xs font-mono text-ink-muted space-y-3 p-6 bg-surface">
                    <p>{pdfLoadError || 'Could not load PDF document directly.'}</p>
                    <button
                      type="button"
                      onClick={() => setPdfSubView('reader')}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-elevated border border-rule-border text-accent-cyan hover:border-accent-cyan transition-colors cursor-pointer"
                    >
                      Switch to Academic Reader View
                    </button>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-surface/90 backdrop-blur-sm p-1 rounded-lg border border-rule-border shadow-sm">
                  <a
                    href={blobPdfUrl || pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={blobPdfUrl || pdfUrl}
                    download={session.sourceUrl || "document.pdf"}
                    className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* Reader View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface border border-rule-border space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent-cyan uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Academic Literature Reader
                    </span>
                    <button
                      type="button"
                      onClick={() => onCiteText(session.contextText || '', session.title)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Cite entire document in chat"
                    >
                      <Quote className="w-3 h-3" />
                      <span>Cite All</span>
                    </button>
                  </div>

                  {session.contextText ? (
                    <div className="p-4 rounded-lg bg-canvas border border-rule-border text-xs leading-relaxed font-sans text-ink-body selection:bg-accent-cyan/30">
                      <MarkdownRenderer content={session.contextText} onTimestampClick={onSeekVideo} />
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-ink-muted font-mono space-y-2">
                      <FileCode className="w-6 h-6 mx-auto text-accent-cyan" />
                      <p>Document text is being indexed or not yet available.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOPIC / CURATED NOTES VIEW */}
        {session.contextType === 'TOPIC' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface border border-rule-border space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Curated Knowledge & Syllabus
                </span>
                {session.contextText && (
                  <button
                    type="button"
                    onClick={() => onCiteText(session.contextText || '', session.title)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Cite reference syllabus in chat"
                  >
                    <Quote className="w-3 h-3" />
                    <span>Cite Syllabus</span>
                  </button>
                )}
              </div>

              {session.contextText ? (
                <div className="p-4 rounded-lg bg-canvas border border-rule-border text-xs leading-relaxed font-sans text-ink-body selection:bg-accent-cyan/30">
                  <MarkdownRenderer content={session.contextText} onTimestampClick={onSeekVideo} />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-ink-muted font-mono space-y-2">
                  <Sparkles className="w-6 h-6 mx-auto text-accent-amber" />
                  <p>This session is exploring generalized academic topics without attached files.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* FLOATING ACTION TOOLTIP FOR HIGHLIGHTED TEXT CITATIONS     */}
      {/* ========================================================= */}
      {selectionAction && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionAction.x}px`,
            top: `${selectionAction.y}px`,
            zIndex: 9999,
          }}
          className="flex items-center gap-1 bg-surface-elevated text-ink-primary border border-accent-cyan/50 shadow-2xl rounded-lg p-1 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs"
        >
          <button
            type="button"
            onClick={() => {
              onCiteText(selectionAction.text);
              clearSelection();
            }}
            className="px-2.5 py-1 rounded-md bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            title="Cite selected text into chat input"
          >
            <Quote className="w-3 h-3" />
            <span>Cite in Chat</span>
          </button>

          {onAskTutor && (
            <button
              type="button"
              onClick={() => {
                onAskTutor(
                  `> "${selectionAction.text}"\n\nCan you explain this excerpt in rigorous detail and test my understanding?`
                );
                clearSelection();
              }}
              className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-elevated border border-rule-border text-accent-cyan font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Immediately ask the Socratic tutor about this selection"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask Tutor</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(selectionAction.text);
              clearSelection();
            }}
            className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
            title="Copy selection"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SourceMaterialViewer;
