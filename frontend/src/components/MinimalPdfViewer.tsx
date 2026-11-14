'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Search,
  X,
  Quote,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface MinimalPdfViewerProps {
  pdfUrl: string;
  onCiteText: (quoteText: string, reference?: string) => void;
  onAskTutor?: (question: string) => void;
  title?: string;
  className?: string;
}

export function MinimalPdfViewer({
  pdfUrl,
  onCiteText,
  onAskTutor,
  title,
  className = '',
}: MinimalPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ephemeral Ctrl+F search overlay (hidden by default, zero permanent space)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchesCount, setSearchMatchesCount] = useState<number>(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Floating selection action state
  const [selectionPopup, setSelectionPopup] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const [copiedQuote, setCopiedQuote] = useState(false);

  // Dynamically load PDF.js client-side only (prevents webpack server-side evaluation errors)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    import('pdfjs-dist')
      .then((pdfjsLib) => {
        if (cancelled) return;
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        (window as any).__pdfjsLib = pdfjsLib;
        setPdfjs(pdfjsLib);

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        loadingTask.promise
          .then((doc) => {
            if (cancelled) return;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            console.error('Error loading PDF document:', err);
            setLoadError(err.message || 'Failed to parse PDF document.');
            setLoading(false);
          });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load pdfjs-dist:', err);
        setLoadError('Failed to initialize PDF renderer.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Handle Ctrl+F keyboard shortcut when inside or focusing the PDF panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const container = containerRef.current;
        if (!container) return;

        const activeEl = document.activeElement;
        const isChatInput = activeEl?.tagName === 'TEXTAREA' || (activeEl?.tagName === 'INPUT' && !container.contains(activeEl));

        const isHoveredOrFocused =
          container.matches(':hover') ||
          container.contains(activeEl) ||
          (!isChatInput && (!activeEl || activeEl === document.body));

        if (isHoveredOrFocused) {
          e.preventDefault();
          setIsSearchOpen(true);
          setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }, 50);
        }
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Search matching in text layers
  const performSearch = useCallback(
    (query: string, forward = true) => {
      if (!query.trim() || !containerRef.current) {
        setSearchMatchesCount(0);
        return;
      }

      const spans = containerRef.current.querySelectorAll('.textLayer span');
      const matches: HTMLElement[] = [];
      const lowerQuery = query.toLowerCase();

      spans.forEach((span) => {
        const text = span.textContent || '';
        const idx = text.toLowerCase().indexOf(lowerQuery);
        if (idx !== -1) {
          matches.push(span as HTMLElement);
        }
      });

      setSearchMatchesCount(matches.length);

      if (matches.length > 0) {
        let nextIdx = 0;
        if (forward) {
          nextIdx = (activeMatchIndex + 1) % matches.length;
        } else {
          nextIdx = (activeMatchIndex - 1 + matches.length) % matches.length;
        }
        setActiveMatchIndex(nextIdx);

        const targetSpan = matches[nextIdx];
        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetSpan.style.backgroundColor = '#0284c7';
        targetSpan.style.color = '#ffffff';
        setTimeout(() => {
          targetSpan.style.backgroundColor = '';
          targetSpan.style.color = 'transparent';
        }, 1500);
      }
    },
    [activeMatchIndex]
  );

  // Handle selection inside the PDF textLayer: immediately auto-populate chat input!
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopup(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length > 3) {
      try {
        const range = sel.getRangeAt(0);
        // Verify selection is within the PDF container
        if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
          return;
        }

        const rect = range.getBoundingClientRect();
        const x = Math.max(10, Math.min(rect.left + rect.width / 2 - 90, window.innerWidth - 210));
        const y = Math.max(10, rect.top - 46);

        setSelectionPopup({ text, x, y });

        // Auto-quote selection right into chat input so the user can immediately ask their question!
        onCiteText(text, `PDF Page ${currentPage}`);
      } catch {
        setSelectionPopup(null);
      }
    } else {
      setSelectionPopup(null);
    }
  }, [currentPage, onCiteText]);

  // Document-level mouseup ensures selection is captured even if drag releases outside the page element
  useEffect(() => {
    const handleDocMouseUp = () => {
      setTimeout(() => {
        handleTextSelect();
      }, 10);
    };

    document.addEventListener('mouseup', handleDocMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [handleTextSelect]);

  // Track visible page on scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pageElements = container.querySelectorAll<HTMLElement>('[data-page-number]');

    for (const el of pageElements) {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.top <= containerRect.top + 250 && rect.bottom >= containerRect.top) {
        const pNum = parseInt(el.getAttribute('data-page-number') || '1', 10);
        setCurrentPage(pNum);
        break;
      }
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(2.5, s + 0.15));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, s - 0.15));
  const handleFitWidth = () => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 32;
    const calculatedScale = Math.max(0.7, Math.min(1.8, containerWidth / 620));
    setScale(calculatedScale);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseUp={handleTextSelect}
      className={`h-full flex flex-col bg-surface/40 border-r border-rule-border overflow-hidden select-text relative font-sans outline-none ${className}`}
    >
      {/* ========================================================= */}
      {/* ULTRA-MINIMAL TOP BAR (Edge-to-edge, zero clutter)        */}
      {/* ========================================================= */}
      <div className="h-10 px-3 border-b border-rule-border bg-surface flex items-center justify-between shrink-0 font-mono text-xs z-20">
        {/* Left: Document Title & Page Count */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs text-ink-primary truncate max-w-[140px] sm:max-w-[200px]" title={title}>
            {title || 'PDF Document'}
          </span>

          {numPages > 0 && (
            <span className="text-[11px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/20 shrink-0">
              {currentPage} / {numPages}
            </span>
          )}
        </div>

        {/* Right: Minimal Zoom, Fit Width & Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono text-ink-muted w-9 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            className="px-1.5 py-0.5 text-[10px] font-mono text-ink-muted hover:text-accent-cyan hover:bg-surface-elevated border border-rule-border rounded transition-colors cursor-pointer"
            title="Fit to Width"
          >
            Fit
          </button>

          <span className="w-px h-3.5 bg-rule-border mx-1" />

          {/* External window & download links */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors"
            title="Open PDF in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={pdfUrl}
            download={title || 'document.pdf'}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors"
            title="Download original PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EPHEMERAL CTRL+F SEARCH POPUP (Takes 0 permanent space)   */}
      {/* ========================================================= */}
      {isSearchOpen && (
        <div className="absolute top-12 right-4 z-40 bg-surface border border-accent-cyan/50 shadow-2xl rounded-lg p-1.5 flex items-center gap-2 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <Search className="w-3.5 h-3.5 text-accent-cyan ml-1" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              performSearch(e.target.value, true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                performSearch(searchQuery, !e.shiftKey);
              } else if (e.key === 'Escape') {
                setIsSearchOpen(false);
              }
            }}
            placeholder="Find in PDF (Ctrl+F)..."
            className="bg-canvas border border-rule-border rounded px-2 py-1 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan w-44"
          />

          {searchMatchesCount > 0 && (
            <span className="text-[10px] text-ink-muted">
              {activeMatchIndex + 1}/{searchMatchesCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => performSearch(searchQuery, false)}
            className="p-1 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-primary"
            title="Previous match (Shift+Enter)"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => performSearch(searchQuery, true)}
            className="p-1 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-primary"
            title="Next match (Enter)"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-primary ml-1"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* FULL-HALF PDF PAGES RENDER CANVAS & TEXTLAYER             */}
      {/* ========================================================= */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 min-h-0 bg-canvas flex flex-col items-center"
      >
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-ink-muted space-y-3 py-16">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"></span>
            <span>Parsing document pages & selectable text layer...</span>
          </div>
        )}

        {loadError && (
          <div className="p-6 text-center text-xs text-ink-muted font-mono space-y-3 my-auto">
            <p className="text-red-400">{loadError}</p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-surface border border-rule-border text-accent-cyan hover:border-accent-cyan inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Browser Window</span>
            </a>
          </div>
        )}

        {!loading && !loadError && pdfDoc && pdfjs && (
          <div className="flex flex-col items-center gap-4 w-full">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pNum) => (
              <PdfPage
                key={pNum}
                pdfjs={pdfjs}
                pdfDoc={pdfDoc}
                pageNumber={pNum}
                scale={scale}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* FLOATING ACTION TOOLTIP FOR IMMEDIATE Socratic QUESTION   */}
      {/* ========================================================= */}
      {selectionPopup && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            zIndex: 9999,
          }}
          className="flex items-center gap-1 bg-surface-elevated text-ink-primary border border-accent-cyan/60 shadow-2xl rounded-lg p-1 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs"
        >
          {onAskTutor && (
            <button
              type="button"
              onClick={() => {
                onAskTutor(
                  `> "${selectionPopup.text}"\n\nCan you explain this excerpt in depth and test my understanding?`
                );
                setSelectionPopup(null);
              }}
              className="px-2.5 py-1 rounded bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              title="Immediately ask Socratic tutor about this excerpt"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask Tutor Now</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(selectionPopup.text);
              setCopiedQuote(true);
              setTimeout(() => {
                setCopiedQuote(false);
                setSelectionPopup(null);
              }, 1200);
            }}
            className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
            title="Copy selection"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectionPopup(null)}
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

/**
 * Individual Page Renderer with Canvas Graphics + In-DOM Transparent TextLayer
 */
interface PdfPageProps {
  pdfjs: any;
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

function PdfPage({ pdfjs, pdfDoc, pageNumber, scale }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const activeTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCurrent = true;

    async function render() {
      if (activeTaskRef.current) {
        try {
          await activeTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!isCurrent) return;

        const viewport = page.getViewport({ scale });
        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render TextLayer immediately in parallel with canvas graphics
        if (textLayerDiv && pdfjs?.TextLayer) {
          page.getTextContent().then((textContent) => {
            if (!isCurrent) return;
            textLayerDiv.innerHTML = '';
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;

            const textLayer = new pdfjs.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
            });
            textLayer.render().catch(() => {});
          }).catch(() => {});
        }

        const task = page.render({
          canvasContext: context,
          viewport,
        });
        activeTaskRef.current = task;

        await task.promise;
        activeTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('[PDF] Render exception:', err);
        }
      }
    }

    render();

    return () => {
      isCurrent = false;
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfjs, pdfDoc, pageNumber, scale]);

  return (
    <div
      data-page-number={pageNumber}
      className="relative shadow-lg rounded-sm bg-white overflow-hidden my-1 border border-rule-border"
      style={{
        width: dimensions.width ? `${dimensions.width}px` : '100%',
        height: dimensions.height ? `${dimensions.height}px` : 'auto',
        maxWidth: '100%',
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div
        ref={textLayerRef}
        className="textLayer select-text"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'clip',
          lineHeight: 1,
          transformOrigin: '0 0',
        }}
      />
    </div>
  );
}

export default MinimalPdfViewer;
