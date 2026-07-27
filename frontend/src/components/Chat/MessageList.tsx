import { useEffect, useRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sword, Star, Crown, AvatarCircle } from "pixelarticons/react";
import { Message } from "../../types/game.types";

interface MessageListProps {
  messages: Message[];
  isProcessing?: boolean;
}

export function MessageList({ messages, isProcessing }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-quest">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-stone-600">
          <Sword width={36} height={36} className="mb-4 text-gold-500/30" />
          <p className="font-pixel text-[9px] text-stone-500 mb-1">
            THE SCROLL AWAITS
          </p>
          <p className="font-pixel text-[7px] text-stone-700">
            Begin the campaign to start your tale
          </p>
        </div>
      )}

      {messages.map((msg, i) => {
        if (msg.type === "narration") {
          return (
            <div key={i} className="relative pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bronze-500/60 via-bronze-500/20 to-transparent" />
              <div className="bg-zinc-900/60 p-4 pixel-border">
                <p className="font-pixel text-[8px] text-gold-500 mb-2 inline-flex items-center gap-1.5">
                  <Crown width={12} height={12} className="text-gold-400" />
                  THE GAME MASTER
                </p>
                <div className="font-pixel text-[14px] text-stone-300 leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="leading-relaxed mb-2 last:mb-0">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-gold-400 font-bold">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-cyan-400/80">{children}</em>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-2">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 my-2">
                          {children}
                        </ol>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-magic-600 pl-3 text-stone-500 my-2 italic">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="bg-zinc-900 px-1.5 py-0.5 text-cyan-400/80 text-[13px]">
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
                        <h1 className="font-pixel text-[11px] text-gold-400 mt-4 mb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-pixel text-[10px] text-gold-400/80 mt-3 mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="font-pixel text-[9px] text-gold-500/70 mt-3 mb-1">
                          {children}
                        </h3>
                      ),
                      table: ({ children }) => (
                        <table className="border-collapse my-2 w-full text-[13px]">
                          {children}
                        </table>
                      ),
                      th: ({ children }) => (
                        <th className="border border-zinc-800 px-2 py-1 text-left font-pixel text-[7px] text-gold-500/70 bg-zinc-900/50">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-zinc-800 px-2 py-1">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        }

        if (msg.type === "action") {
          return (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="text-magic-500 mt-0.5 shrink-0">
                <AvatarCircle width={16} height={16} />
              </span>
              <div className="flex flex-col justify-start min-w-0">
                <span className="font-pixel text-[8px] text-magic-500 mb-0.5">
                  {msg.characterName}
                </span>
                <p className="font-pixel text-[14px] text-stone-300 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        }

        if (msg.type === "roll") {
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-gold-400 mt-0.5 shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <div>
                <span className="font-pixel text-[8px] text-gold-400 mb-0.5">
                  {msg.characterName}
                </span>
                <p className="font-mono text-[14px] text-stone-300 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        }

        if (msg.type === "system") {
          return (
            <div key={i} className="text-center py-1">
              <span className="font-pixel text-[7px] text-stone-600 italic">
                {msg.content}
              </span>
            </div>
          );
        }

        return null;
      })}

      {isProcessing && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-cyan-400 animate-crystal-pulse">
            <Star width={12} height={12} />
          </span>
          <span className="font-pixel text-[8px] text-cyan-400/70 text-shadow-glow-cyan">
            The Arcane Master is consulting the ancient scrolls
            <span className="thinking-dot inline-block ml-0.5">.</span>
            <span className="thinking-dot inline-block">.</span>
            <span className="thinking-dot inline-block">.</span>
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
