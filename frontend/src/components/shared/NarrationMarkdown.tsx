import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NarrationMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-gold-400 font-bold">{children}</strong>
        ),
        em: ({ children }) => <em className="text-cyan-400/80">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-magic-600 pl-3 text-stone-500 my-2 italic">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-zinc-900 px-1.5 py-0.5 text-cyan-400/80 text-sm">
            {children as ReactNode}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-zinc-900 p-3 overflow-x-auto my-2 pixel-border-light">
            {children as ReactNode}
          </pre>
        ),
        hr: () => <div className="divider-gold my-3" />,
        h1: ({ children }) => (
          <h1 className="font-pixel text-xs text-gold-400 mt-4 mb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-pixel text-xs text-gold-400/80 mt-3 mb-2">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-pixel text-xs text-gold-500/70 mt-3 mb-1">
            {children}
          </h3>
        ),
        table: ({ children }) => (
          <table className="border-collapse my-2 w-full text-sm">
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th className="border border-zinc-800 px-2 py-1 text-left font-pixel text-xs text-gold-500/70 bg-zinc-900/50">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-zinc-800 px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
