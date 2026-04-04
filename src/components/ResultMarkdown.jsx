import React from 'react';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-inherit leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-inherit">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-2 text-xs font-bold uppercase tracking-wide text-inherit/90 first:mt-0">{children}</h4>,
  code: ({ children, className }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[0.85em] [.legal-ai-md--dark_&]:bg-slate-700/80">
          {children}
        </code>
      );
    }
    return <code className="font-mono text-[0.85em]">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-slate-100 p-2 text-xs [.legal-ai-md--dark_&]:bg-slate-800/80">
      {children}
    </pre>
  ),
};

/**
 * Renders stored AI markdown; falls back to line breaks if parsing fails.
 */
export default function ResultMarkdown({ children, className = '', variant = 'light' }) {
  const raw = typeof children === 'string' ? children : '';
  if (!raw.trim()) return null;

  const variantClass = variant === 'dark' ? 'legal-ai-md--dark' : '';

  return (
    <div className={`text-sm ${variantClass} ${className}`}>
      <ReactMarkdown components={markdownComponents}>{raw}</ReactMarkdown>
    </div>
  );
}
