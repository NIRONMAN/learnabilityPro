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
  Code
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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      router.push('/');
      return;
    }
    loadDiagrams();
  }, [sessionId, router]);

  const loadDiagrams = async () => {
    try {
      setLoading(true);
      const data = await api.getDiagrams(sessionId);
      setDiagrams(data);
      if (data.length > 0) {
        setSelectedDiagram(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const newDiagram = await api.generateDiagram(sessionId, customPrompt);
      setDiagrams((prev) => [newDiagram, ...prev]);
      setSelectedDiagram(newDiagram);
      setCustomPrompt('');
    } catch (err: any) {
      alert(err.message || 'Failed to generate diagram');
    } finally {
      setGenerating(false);
    }
  };

  // Render Mermaid diagram whenever selectedDiagram changes
  useEffect(() => {
    if (!selectedDiagram || !containerRef.current) return;

    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
        });

        const id = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, selectedDiagram.mermaidCode);

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxHeight = '650px';
          }
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-6 text-center text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs space-y-2">
              <p class="font-bold">Diagram Render Notice</p>
              <p>Raw diagram code generated. Click "View Mermaid Code" to inspect or edit.</p>
            </div>
          `;
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [selectedDiagram]);

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
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading concept diagrams...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${sessionId}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Visual Mindmap & Diagrams</h1>
            <p className="text-xs text-slate-400">
              {selectedDiagram ? selectedDiagram.title : 'Concept Trees & Flowcharts'}
            </p>
          </div>
        </div>

        {selectedDiagram && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawCode(!showRawCode)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              {showRawCode ? 'Show Diagram' : 'View Mermaid Code'}
            </button>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleExportSvg}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              Export SVG
            </button>
          </div>
        )}
      </div>

      {/* Synthesis Input Form */}
      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="e.g. Create a flowchart showing decision logic, or a hierarchical mindmap..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={generating}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-600/30"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? 'Synthesizing...' : 'Generate Mindmap'}
        </button>
      </form>

      {/* Viewer Panel */}
      {diagrams.length === 0 ? (
        <div className="py-24 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="p-3 bg-amber-950/60 text-amber-400 border border-amber-800/40 rounded-xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No concept diagrams yet</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Synthesize a validated Mermaid.js diagram from your study material to visualize relationships, architectures, and flows.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-amber-600/30"
          >
            {generating ? 'Synthesizing...' : 'Synthesize First Mindmap'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Diagrams Picker if multiple */}
          {diagrams.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {diagrams.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDiagram(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors whitespace-nowrap ${
                    selectedDiagram?.id === d.id
                      ? 'bg-amber-950 text-amber-300 border-amber-700/80 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          )}

          {/* Canvas & Controls */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl flex flex-col items-center min-h-[500px] justify-center">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur border border-slate-800 p-1.5 rounded-xl z-10">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.15))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {showRawCode ? (
              <pre className="w-full text-xs font-mono text-amber-300 bg-slate-950 p-6 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
                {selectedDiagram?.mermaidCode}
              </pre>
            ) : (
              <div
                className="w-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <div ref={containerRef} className="w-full flex justify-center" />
              </div>
            )}
          </div>

          {selectedDiagram?.explanation && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                Concept Explanation
              </span>
              <p className="leading-relaxed">{selectedDiagram.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
