import { memo } from 'react';

interface TypingIndicatorProps {
  typingPlayers: Map<string, string>;
  playerId: string;
}

export const TypingIndicator = memo(function TypingIndicator({ typingPlayers, playerId }: TypingIndicatorProps) {
  const others = Array.from(typingPlayers.entries()).filter(([id]) => id !== playerId);

  if (others.length === 0) return null;

  const names = others.map(([, name]) => name);
  const text = names.length === 1
    ? `${names[0]} is inscribing...`
    : `${names.join(', ')} are inscribing...`;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="font-pixel text-[7px] text-gold-500/60 italic">{text}</span>
    </div>
  );
});
