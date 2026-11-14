'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * MarkdownRenderer component
 * Safely renders GitHub Flavored Markdown (GFM) using react-markdown and remark-gfm.
 * Verified compatible with Next.js 15 and React 19.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-invert max-w-none text-xs leading-relaxed space-y-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styled code blocks
          code({ className, children, ...props }) {
            const isInline = !className;
            return isInline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-[11px] text-accent-cyan border border-rule-border"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="block p-3 rounded-lg bg-surface-elevated font-mono text-[11px] text-ink-primary overflow-x-auto border border-rule-border my-2"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom styled blockquotes
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-2 border-accent-cyan/60 pl-3 italic text-ink-muted my-2"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Custom styled tables
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-3 border border-rule-border rounded-lg">
                <table className="w-full text-left border-collapse text-[11px] font-mono" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="p-2 border-b border-rule-border bg-surface-elevated font-bold text-ink-primary" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="p-2 border-b border-rule-border/60 text-ink-body" {...props}>
                {children}
              </td>
            );
          },
          // Custom styled links
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-cyan hover:underline decoration-accent-cyan/40 underline-offset-2"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
