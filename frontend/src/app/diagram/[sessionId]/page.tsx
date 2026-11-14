'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage, Diagram } from '@/lib/api';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Copy,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code,
  Network,
  Check,
  BookOpen,
  BrainCircuit
} from 'lucide-react';

export default function DiagramPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRawCode, setShowRawCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Strong Authentication Gate: Non-authenticated users are redirected back to landing page
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.replace('/?auth=login');
      return;
    }
    api.getMe()
      .then(() => {
        loadDiagrams();
      })
      .catch(() => {
        authStorage.removeToken();
        router.replace('/?auth=login');
      });
  }, [sessionId, router]);

  const loadDiagrams = async () => {
    try {
      setLoading(true);
      const data = await api.getDiagrams(sessionId);
      if (data && data.length > 0) {
        setDiagrams(data);
        setSelectedDiagram(data[0]);
      } else {
        setDiagrams([]);
        setSelectedDiagram(null);
      }
    } catch (err) {
      console.error('Failed to load diagrams:', err);
      setDiagrams([]);
      setSelectedDiagram(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDiagramError(null);
    try {
      setGenerating(true);
      const newDiagram = await api.generateDiagram(sessionId, customPrompt);
      if (newDiagram) {
        setDiagrams((prev) => [newDiagram, ...prev]);
        setSelectedDiagram(newDiagram);
        setCustomPrompt('');
      }
    } catch (err: any) {
      setDiagramError(err.message || 'Failed to synthesize mindmap from literature.');
    } finally {
      setGenerating(false);
    }
  };

  // Render Mermaid diagram whenever selectedDiagram changes or zoom updates
  useEffect(() => {
    if (!selectedDiagram || !containerRef.current) return;

    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('theme-blueprint');

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        });

        const id = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, selectedDiagram.mermaidCode);

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxHeight = '550px';
            svgEl.style.transform = `scale(${zoomLevel})`;
            svgEl.style.transformOrigin = 'center center';
            svgEl.style.transition = 'transform 0.2s ease-out';
          }
        }
      } catch (err) {
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-6 text-center text-accent-cyan bg-surface border border-rule-border rounded-xl text-xs space-y-2 font-mono">
              <p class="font-bold">Mermaid Diagram Ready</p>
              <p class="text-ink-muted">Raw syntax generated. Toggle "View Mermaid Code" to inspect or edit.</p>
            </div>
          `;
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [selectedDiagram, zoomLevel]);

  const handleCopyCode = () => {
    if (!selectedDiagram) return;
    navigator.clipboard.writeText(selectedDiagram.mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSvg = () => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDiagram?.title || 'concept-map'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-muted text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse mr-2"></span>
        Loading concept diagrams...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule-border font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${sessionId}`}
            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded-md transition-colors"
            title="Return to Study Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] text-accent-cyan font-semibold uppercase mb-0.5">
              <Network className="w-3.5 h-3.5" />
              <span>Concept Mindmap & Hierarchical Trees</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-ink-primary">
              {selectedDiagram ? selectedDiagram.title : 'Concept DAG'}
            </h1>
          </div>
        </div>

        {selectedDiagram && (
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center border border-rule-border rounded-lg bg-surface p-0.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2 text-[10px] font-mono text-ink-muted hover:text-ink-primary"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-elevated rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowRawCode(!showRawCode)}
              className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-rule-border text-ink-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{showRawCode ? 'Show Diagram' : 'Mermaid Code'}</span>
            </button>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-rule-border text-ink-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExportSvg}
              className="px-3 py-1.5 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SVG</span>
            </button>
          </div>
        )}
      </div>

      {/* Synthesis Input Form */}
      <form onSubmit={handleGenerate} className="flex gap-2 font-mono text-xs">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="e.g. Map cross-attention dependencies, or show forward pass dataflow..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-surface border border-rule-border text-ink-primary placeholder:text-ink-subtle text-xs focus:outline-none focus:border-accent-cyan"
        />
        <button
          type="submit"
          disabled={generating}
          className="px-4 py-2 bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{generating ? 'Synthesizing...' : 'Synthesize Mindmap'}</span>
        </button>
      </form>

      {/* Error Alert */}
      {diagramError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-between">
          <span>{diagramError}</span>
          <button
            onClick={() => setDiagramError(null)}
            className="text-[11px] underline hover:text-red-300 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Viewer Panel */}
      <div className="space-y-4">
        {diagrams.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
            {diagrams.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiagram(d)}
                className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDiagram?.id === d.id
                    ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan font-bold'
                    : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>
        )}

        {!selectedDiagram ? (
          <div className="p-12 rounded-xl bg-surface border border-dashed border-rule-border text-center space-y-3 font-sans">
            <Network className="w-8 h-8 text-accent-amber mx-auto" />
            <h4 className="text-sm font-bold text-ink-primary font-mono">No mindmap generated yet for this session</h4>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Enter a concept focus above or click &quot;Synthesize Mindmap&quot; to generate an architectural directed graph from your literature.
            </p>
          </div>
        ) : showRawCode ? (
          <div className="p-5 rounded-xl bg-surface border border-rule-border font-mono text-xs overflow-x-auto shadow-sm">
            <div className="flex items-center justify-between text-ink-muted mb-3 pb-2 border-b border-rule-border">
              <span>Mermaid Definition</span>
              <span>Validated DAG</span>
            </div>
            <pre className="text-accent-cyan whitespace-pre-wrap leading-relaxed">
              {selectedDiagram?.mermaidCode}
            </pre>
          </div>
        ) : (
          <div className="p-6 sm:p-10 rounded-xl bg-surface border border-rule-border shadow-sm flex flex-col items-center justify-center min-h-[460px] overflow-hidden">
            <div ref={containerRef} className="w-full flex items-center justify-center" />
          </div>
        )}

        {selectedDiagram?.explanation && (
          <div className="p-4 rounded-xl bg-surface border border-rule-border font-mono text-xs text-ink-muted flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-cyan shrink-0" />
            <p className="font-sans text-xs text-ink-body">{selectedDiagram.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
