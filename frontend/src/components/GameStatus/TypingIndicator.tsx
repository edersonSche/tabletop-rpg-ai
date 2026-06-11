interface TypingIndicatorProps {
  typingPlayers: Map<string, string>;
  playerId: string;
}

export function TypingIndicator({ typingPlayers, playerId }: TypingIndicatorProps) {
  const others = Array.from(typingPlayers.entries()).filter(([id]) => id !== playerId);

  if (others.length === 0) return null;

  const names = others.map(([, name]) => name);
  const text = names.length === 1
    ? `${names[0]} is typing...`
    : `${names.join(', ')} are typing...`;

  return (
    <div className="flex items-center gap-2 text-mono text-sm text-gold px-1 py-1">
      <span className="flex gap-0.5">
        <span className="typing-dot animation-delay-0"></span>
        <span className="typing-dot animation-delay-200"></span>
        <span className="typing-dot animation-delay-400"></span>
      </span>
      <span className="italic">{text}</span>
    </div>
  );
}
