'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  FileText,
  Youtube,
  BookOpen,
  Copy,
  Check,
  Quote,
  Sparkles,
  Play,
  Pause,
  X,
  Clock
} from 'lucide-react';
import { StudySession } from '@/lib/api';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

// Dynamically import MinimalPdfViewer on client side to avoid SSR canvas/DOM issues
const MinimalPdfViewer = dynamic(() => import('@/components/MinimalPdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex flex-col items-center justify-center text-xs font-mono text-ink-muted space-y-3 bg-canvas">
      <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"></span>
      <span>Rendering Minimal PDF Studio...</span>
    </div>
  ),
});

export interface SourceMaterialViewerProps {
  session: StudySession;
  hasPdfFile: boolean;
  pdfUrl: string;
  onCiteText: (quoteText: string, reference?: string) => void;
  onAskTutor?: (question: string) => void;
  youtubeStartSec?: number | null;
  onSeekVideo?: (seconds: number) => void;
  onPlaybackChange?: (currentTime: number, isPaused: boolean, currentDialogue?: string) => void;
  onClose?: () => void;
  className?: string;
}

interface TranscriptSegment {
  timestamp?: string;
  seconds?: number;
  text: string;
}

function formatSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SourceMaterialViewer({
  session,
  hasPdfFile,
  pdfUrl,
  onCiteText,
  onAskTutor,
  youtubeStartSec,
  onSeekVideo,
  onPlaybackChange,
  onClose,
  className = '',
}: SourceMaterialViewerProps) {
  // Tab/view mode within material panel
  const [pdfSubView, setPdfSubView] = useState<'embed' | 'reader'>(hasPdfFile ? 'embed' : 'reader');
  const [youtubeSubView, setYoutubeSubView] = useState<'transcript' | 'summary'>('transcript');
  const [copiedSegmentIdx, setCopiedSegmentIdx] = useState<number | null>(null);

  // Video playback tracking
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState<number>(0);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(true);
  const playerRef = useRef<any>(null);
  const playerIframeId = useMemo(() => `yt-player-${session.id}`, [session.id]);

  // Floating selection action state for reader/transcript text
  const [selectionAction, setSelectionAction] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync subview if hasPdfFile changes
  useEffect(() => {
    if (hasPdfFile && pdfSubView === 'reader' && !session.contextText) {
      setPdfSubView('embed');
    } else if (!hasPdfFile && pdfSubView === 'embed') {
      setPdfSubView('reader');
    }
  }, [hasPdfFile, session.contextText, pdfSubView]);

  // Handle text selection in Reader or Transcript
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionAction(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 4) {
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const x = Math.max(10, Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 220));
        const y = Math.max(10, rect.top - 46);
        setSelectionAction({ text, x, y });

        // Instantly populate chat input so user can ask immediately!
        onCiteText(text, session.title || 'Selected Literature');
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

  // YouTube embed helper
  const youtubeEmbedUrl = useMemo(() => {
    if (!session.sourceUrl) return null;
    const match = session.sourceUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return null;
    const videoId = match[1];
    const base = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
    return youtubeStartSec ? `${base}&start=${youtubeStartSec}&autoplay=1` : base;
  }, [session.sourceUrl, youtubeStartSec]);

  // Split session.contextText into distinct summary and transcript portions
  const { summaryContent, transcriptContent } = useMemo(() => {
    if (!session.contextText) return { summaryContent: '', transcriptContent: '' };
    const text = session.contextText;
    const transcriptHeaderIdx = text.indexOf('### Lecture Transcript');
    const summaryHeaderIdx = text.indexOf('### Lecture Summary');

    if (transcriptHeaderIdx !== -1) {
      const trans = text.slice(transcriptHeaderIdx + '### Lecture Transcript'.length).trim();
      let summ = '';
      if (summaryHeaderIdx !== -1) {
        summ = text.slice(summaryHeaderIdx + '### Lecture Summary'.length, transcriptHeaderIdx).trim();
      } else {
        summ = text.slice(0, transcriptHeaderIdx).trim();
      }
      return { summaryContent: summ, transcriptContent: trans };
    }

    if (summaryHeaderIdx !== -1) {
      return {
        summaryContent: text.slice(summaryHeaderIdx + '### Lecture Summary'.length).trim(),
        transcriptContent: text,
      };
    }

    return { summaryContent: '', transcriptContent: text };
  }, [session.contextText]);

  // Parse transcript segments from transcriptContent with robust multi-format timestamp regex
  const parsedTranscript: TranscriptSegment[] = useMemo(() => {
    const rawSource = transcriptContent || session.contextText;
    if (!rawSource) return [];
    const lines = rawSource.split('\n');
    const segments: TranscriptSegment[] = [];

    const tsRegex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]/;
    let currentSegment: TranscriptSegment | null = null;
    const containsAnyTimestamps = tsRegex.test(rawSource);

    if (containsAnyTimestamps) {
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (
          line.startsWith('YouTube Video:') ||
          line.startsWith('### Lecture Summary') ||
          line.startsWith('### Lecture Transcript')
        ) {
          continue;
        }

        const match = line.match(tsRegex);
        if (match) {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          const fullTs = match[0].replace(/[\[\]]/g, '');
          const h = match[1] ? Number(match[1]) : 0;
          const min = Number(match[2]);
          const sec = Number(match[3]);
          const totalSec = h * 3600 + min * 60 + sec;
          const textContent = line.replace(tsRegex, '').trim();
          currentSegment = {
            timestamp: fullTs,
            seconds: totalSec,
            text: textContent,
          };
        } else if (currentSegment) {
          currentSegment.text += '\n' + line;
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }
    } else {
      const paragraphs = rawSource
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(
          (p) =>
            p &&
            !p.startsWith('YouTube Video:') &&
            !p.startsWith('### Lecture Summary') &&
            !p.startsWith('### Lecture Transcript')
        );

      paragraphs.forEach((para) => {
        segments.push({
          text: para,
        });
      });
    }

    return segments;
  }, [transcriptContent, session.contextText]);

  // Find active segment matching playback time
  const activeSegmentIdx = useMemo(() => {
    if (!parsedTranscript.length || currentPlaybackSec === undefined) return -1;
    let found = -1;
    for (let i = 0; i < parsedTranscript.length; i++) {
      const sec = parsedTranscript[i].seconds;
      if (sec !== undefined && sec <= currentPlaybackSec) {
        found = i;
      } else if (sec !== undefined && sec > currentPlaybackSec) {
        break;
      }
    }
    return found;
  }, [parsedTranscript, currentPlaybackSec]);

  const activeSegment = activeSegmentIdx >= 0 ? parsedTranscript[activeSegmentIdx] : null;

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (session.contextType !== 'YOUTUBE' || !session.sourceUrl) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const setupPlayer = () => {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;

      const iframeEl = document.getElementById(playerIframeId);
      if (!iframeEl) return;

      try {
        if (playerRef.current) {
          try {
            playerRef.current.destroy?.();
          } catch {}
        }

        playerRef.current = new YT.Player(playerIframeId, {
          events: {
            onReady: (event: any) => {
              if (youtubeStartSec !== null && youtubeStartSec !== undefined) {
                event.target.seekTo(youtubeStartSec, true);
              }
            },
            onStateChange: (event: any) => {
              const player = event.target;
              const time = Math.floor(player.getCurrentTime?.() || 0);
              const paused = event.data === 2; // YT.PlayerState.PAUSED
              const playing = event.data === 1; // YT.PlayerState.PLAYING

              setCurrentPlaybackSec(time);
              setIsVideoPaused(paused);

              // Notify parent about state change
              const seg = parsedTranscript.find((s) => s.seconds !== undefined && s.seconds <= time);
              onPlaybackChange?.(time, paused, seg?.text);

              if (playing) {
                if (pollInterval) clearInterval(pollInterval);
                pollInterval = setInterval(() => {
                  try {
                    const t = Math.floor(player.getCurrentTime?.() || 0);
                    setCurrentPlaybackSec(t);
                    const s = parsedTranscript.find((item) => item.seconds !== undefined && item.seconds <= t);
                    onPlaybackChange?.(t, false, s?.text);
                  } catch {}
                }, 1000);
              } else {
                if (pollInterval) clearInterval(pollInterval);
              }
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player setup notice:', err);
      }
    };

    if (!(window as any).YT || !(window as any).YT.Player) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
      (window as any).onYouTubeIframeAPIReady = setupPlayer;
    } else {
      setupPlayer();
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {}
      }
    };
  }, [session.contextType, session.sourceUrl, playerIframeId, parsedTranscript]);

  // Seamless seek when youtubeStartSec changes
  useEffect(() => {
    if (youtubeStartSec !== null && youtubeStartSec !== undefined) {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(youtubeStartSec, true);
          playerRef.current.playVideo?.();
          setCurrentPlaybackSec(youtubeStartSec);
          setIsVideoPaused(false);
        } catch {}
      }
    }
  }, [youtubeStartSec]);

  // Action: Ask tutor what was just said
  const handleAskWhatWasJustSaid = () => {
    const formatted = formatSeconds(currentPlaybackSec);
    const excerpt = activeSegment ? activeSegment.text : '';
    const query = `What did the speaker just say at [${formatted}]${excerpt ? ` ("${excerpt}")` : ''}? Can you break down the concept clearly?`;
    if (onAskTutor) {
      onAskTutor(query);
    } else {
      onCiteText(query, `Timestamp [${formatted}]`);
    }
  };

  // If in PDF Embed mode with valid PDF file, render the dedicated MinimalPdfViewer edge-to-edge!
  if (session.contextType === 'PDF' && pdfSubView === 'embed' && hasPdfFile) {
    return (
      <div className={`h-full w-full flex flex-col overflow-hidden relative ${className}`}>
        <MinimalPdfViewer
          pdfUrl={pdfUrl}
          onCiteText={onCiteText}
          onAskTutor={onAskTutor}
          title={session.sourceUrl || session.title}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`h-full flex flex-col bg-surface/50 border-r border-rule-border overflow-hidden select-text relative font-sans ${className}`}
    >
      {/* ========================================================= */}
      {/* MINIMAL HEADER                                            */}
      {/* ========================================================= */}
      <div className="h-10 px-3 border-b border-rule-border bg-surface flex items-center justify-between shrink-0 font-mono text-xs z-10">
        <div className="flex items-center gap-2 min-w-0">
          {session.contextType === 'YOUTUBE' ? (
            <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
          ) : session.contextType === 'PDF' ? (
            <FileText className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
          ) : (
            <BookOpen className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
          )}

          <span className="font-semibold text-xs text-ink-primary truncate max-w-[160px] sm:max-w-xs" title={session.sourceUrl || session.title}>
            {session.title || session.sourceUrl || 'Source Material'}
          </span>
        </div>

        {/* Sub-view toggles and actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* PDF toggle */}
          {session.contextType === 'PDF' && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded border border-rule-border">
              {hasPdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfSubView('embed')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    pdfSubView === 'embed'
                      ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                  title="Switch to in-DOM PDF Document Viewer"
                >
                  PDF
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
                title="Academic Reader"
              >
                Reader
              </button>
            </div>
          )}

          {/* YouTube toggle between Transcript & Summary */}
          {session.contextType === 'YOUTUBE' && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded border border-rule-border">
              <button
                type="button"
                onClick={() => setYoutubeSubView('transcript')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  youtubeSubView === 'transcript'
                    ? 'bg-canvas text-accent-cyan border border-rule-border shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Time-indexed lecture transcript"
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
                title="Curated outline and high-level summary"
              >
                Summary
              </button>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
              title="Hide source material panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BODY CONTENT: YOUTUBE MEDIA OR ACADEMIC READER            */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 bg-canvas">
        {/* YOUTUBE MEDIA VIEW */}
        {session.contextType === 'YOUTUBE' && (
          <div className="space-y-3">
            {youtubeEmbedUrl ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-rule-border shadow-md bg-black shrink-0 relative">
                <iframe
                  id={playerIframeId}
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

            {/* REAL-TIME PLAYBACK CONTEXT & PAUSED ACTION BAR */}
            {currentPlaybackSec > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-rule-border text-xs shadow-xs transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  {isVideoPaused ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-primary font-bold">
                      <span>[{formatSeconds(currentPlaybackSec)}]</span>
                      <span className="text-[10px] text-ink-muted font-normal uppercase tracking-wider">
                        {isVideoPaused ? 'Paused' : 'Playing'}
                      </span>
                    </div>
                    {activeSegment && (
                      <span className="text-[11px] text-ink-muted truncate font-sans max-w-[180px] sm:max-w-xs">
                        &ldquo;{activeSegment.text}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAskWhatWasJustSaid}
                  className="px-2.5 py-1 rounded-md bg-accent-cyan text-slate-950 text-xs font-bold hover:bg-accent-cyan/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ml-2"
                  title="Ask AI tutor what the speaker just said at this moment"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>What did he just say?</span>
                </button>
              </div>
            )}

            {/* Transcript or Summary */}
            {youtubeSubView === 'transcript' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted px-1">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                    Lecture Transcript ({parsedTranscript.length} segments)
                  </span>
                  <span className="text-[10px]">Select text to cite into chat</span>
                </div>

                {parsedTranscript.length > 0 ? (
                  <div className="space-y-2 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                    {parsedTranscript.map((segment, idx) => {
                      const isCurrent = idx === activeSegmentIdx;
                      return (
                        <div
                          key={idx}
                          className={`group p-2.5 rounded-lg border transition-all text-xs leading-relaxed space-y-1.5 ${
                            isCurrent
                              ? 'border-accent-cyan/80 bg-accent-cyan/10 ring-1 ring-accent-cyan/30 shadow-xs'
                              : 'border-rule-border bg-surface hover:bg-surface-elevated hover:border-accent-cyan/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5">
                              {segment.timestamp ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (segment.seconds !== undefined) {
                                      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                                        playerRef.current.seekTo(segment.seconds, true);
                                        playerRef.current.playVideo?.();
                                        setCurrentPlaybackSec(segment.seconds);
                                        setIsVideoPaused(false);
                                      } else {
                                        onSeekVideo?.(segment.seconds);
                                      }
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                    isCurrent
                                      ? 'bg-accent-cyan text-slate-950'
                                      : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20'
                                  }`}
                                  title={`Seek video to ${segment.timestamp}`}
                                >
                                  {isCurrent && !isVideoPaused ? (
                                    <Pause className="w-2.5 h-2.5 fill-current" />
                                  ) : (
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                  )}
                                  <span>{segment.timestamp}</span>
                                </button>
                              ) : (
                                <span className="text-ink-muted text-[10px]">Segment #{idx + 1}</span>
                              )}

                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-accent-cyan/20 text-accent-cyan">
                                  {isVideoPaused ? 'Paused Here' : 'Playing'}
                                </span>
                              )}
                            </div>

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

                          <div className="text-ink-body font-sans text-xs selection:bg-accent-cyan/30 [&>p]:my-0.5">
                            <MarkdownRenderer content={segment.text} onTimestampClick={onSeekVideo} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface border border-rule-border text-center text-xs text-ink-muted font-mono">
                    Transcript is indexing or not available for this video.
                  </div>
                )}
              </div>
            )}

            {youtubeSubView === 'summary' && (summaryContent || session.contextText) && (
              <div className="p-4 rounded-xl bg-surface border border-rule-border space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span className="font-bold text-accent-cyan">Lecture Summary & Core Insights</span>
                  <button
                    type="button"
                    onClick={() => onCiteText(summaryContent || session.contextText || '', 'Video Summary')}
                    className="text-accent-cyan hover:underline flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                  >
                    <Quote className="w-3 h-3" /> Cite Summary
                  </button>
                </div>
                <div className="text-xs text-ink-body font-sans leading-relaxed">
                  <MarkdownRenderer content={summaryContent || session.contextText || ''} onTimestampClick={onSeekVideo} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* READER VIEW (for PDF text or starter sessions) */}
        {session.contextType === 'PDF' && (
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
                  <FileText className="w-6 h-6 mx-auto text-accent-cyan" />
                  <p>Document text is being indexed or not yet available.</p>
                </div>
              )}
            </div>
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
