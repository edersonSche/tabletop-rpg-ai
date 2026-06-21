import { useEffect, useRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sword, Star, AvatarCircle } from 'pixelarticons/react';

interface Message {
  type: 'system' | 'action' | 'narration' | 'roll';
  content: string;
  characterName?: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  isProcessing?: boolean;
}

export function MessageList({ messages, isProcessing }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-pixel">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-dungeon-400 text-mono text-lg">
          <Sword width={40} height={40} className="mb-4" />
          <p>The adventure hasn't started yet...</p>
          <p className="text-sm">Start the campaign to begin playing</p>
        </div>
      )}

      {messages.map((msg, i) => {
        if (msg.type === 'narration') {
          return (
            <div key={i} className="text-mono text-dungeon-100 leading-relaxed">
              <p className="text-gold text-xs mb-1 inline-flex items-center gap-1">Game Master</p>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="text-gold">{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-dungeon-600 pl-3  text-dungeon-200 my-2">{children}</blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-dungeon-700 px-1 rounded text-sm text-dungeon-100">{children as ReactNode}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-dungeon-700 p-3 rounded overflow-x-auto my-2">{children as ReactNode}</pre>
                  ),
                  hr: () => <div className="border-t border-dungeon-600 my-3" />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
              <div className="border-t border-dungeon-600 my-3"></div>
            </div>
          );
        }

        if (msg.type === 'action') {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-magic text-sm"><AvatarCircle width={16} height={16} /></span>
              
              <div className='flex flex-col justify-start'>
                <span className="text-mono text-sm text-gold font-bold">{msg.characterName}</span>
                <p className="text-mono text-dungeon-100">{msg.content}</p>
              </div>
            </div>
          );
        }

        if (msg.type === 'roll') {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-gold text-sm mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <div>
                <span className="text-mono text-sm text-gold font-bold">{msg.characterName}</span>
                <p className="text-mono text-dungeon-100">{msg.content}</p>
              </div>
            </div>
          );
        }

        if (msg.type === 'system') {
          return (
            <div key={i} className="text-center">
              <span className="text-mono text-xs text-dungeon-300 italic">{msg.content}</span>
            </div>
          );
        }

        return null;
      })}

      {isProcessing && (
        <div className="flex items-center gap-2 text-mono text-dungeon-400">
          <span className="text-gold text-xs inline-flex items-center gap-1"><Star width={12} height={12} /> Game Master is thinking</span>
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.6s' }} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
