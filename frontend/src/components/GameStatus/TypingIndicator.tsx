import { memo } from "react";
import { useGame } from "../../hooks/useGame";

interface TypingIndicatorProps {
  typingPlayers: Map<string, string>;
  playerId: string;
}

const TypingIndicatorCore = memo(function TypingIndicatorCore({ typingPlayers, playerId }: TypingIndicatorProps) {
  const others = Array.from(typingPlayers.entries()).filter(([id]) => id !== playerId);

  if (others.length === 0) return null;

  const names = others.map(([, name]) => name);
  const text = names.length === 1
    ? `${names[0]} is inscribing...`
    : `${names.join(', ')} are inscribing...`;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="font-pixel text-xs text-gold-500/60 italic">{text}</span>
    </div>
  );
});

export function TypingIndicator({ playerId }: { playerId: string }) {
  const typingPlayers = useGame((s) => s.typingPlayers);
  return <TypingIndicatorCore typingPlayers={typingPlayers} playerId={playerId} />;
}
