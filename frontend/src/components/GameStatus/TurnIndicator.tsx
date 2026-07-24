import { memo, type ReactNode } from 'react';
import { BookOpen, Sword, Target, Clock } from 'pixelarticons/react';

interface TurnIndicatorProps {
  currentTurn: string | null;
  type: string | null;
  target: string | null;
  players: Array<{ id: string; name: string }>;
  playerId: string;
}

export const TurnIndicator = memo(function TurnIndicator({ currentTurn, type, target, players, playerId }: TurnIndicatorProps) {
  const getTurnDescription = (): { icon: ReactNode; text: string; accent?: boolean } => {
    if (!type || type === 'narration_only') {
      return { icon: <BookOpen width={12} height={12} className="text-gold-500 shrink-0" />, text: 'NARRATIVE PHASE' };
    }
    if (type === 'group_action') {
      return { icon: <Sword width={12} height={12} className="text-gold-500 shrink-0" />, text: 'FREE ACTION' };
    }
    if (type === 'call_player' || type === 'call_roll') {
      const player = players.find(p => p.id === target);
      const name = player?.name || 'Someone';
      const isMe = target === playerId;
      return {
        icon: <Target width={12} height={12} className={isMe ? 'text-cyan-400 shrink-0' : 'text-gold-500 shrink-0'} />,
        text: isMe ? 'YOUR TURN' : `${name.toUpperCase()}'S TURN`,
        accent: isMe,
      };
    }
    return { icon: <Clock width={12} height={12} className="text-stone-600 shrink-0" />, text: 'WAITING...' };
  };

  const info = getTurnDescription();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${info.accent ? 'bg-cyan-400/10 pixel-border-cyan' : ''}`}>
      {info.icon}
      <span className={`font-pixel text-[8px] tracking-wider ${info.accent ? 'text-cyan-400 text-shadow-glow-cyan' : 'text-stone-300'}`}>
        {info.text}
      </span>
    </div>
  );
});
