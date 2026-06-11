import type { ReactNode } from 'react';
import { BookOpen, Sword, Target, Clock } from 'pixelarticons/react';

interface TurnIndicatorProps {
  currentTurn: string | null;
  type: string | null;
  target: string | null;
  players: Array<{ id: string; name: string }>;
  playerId: string;
}

export function TurnIndicator({ currentTurn, type, target, players, playerId }: TurnIndicatorProps) {
  const getTurnDescription = (): { icon: ReactNode; text: string; color: string } => {
    if (!type || type === 'narration_only') {
      return { icon: <BookOpen width={16} height={16} />, text: 'Narrative', color: 'text-magic' };
    }
    if (type === 'group_action') {
      return { icon: <Sword width={16} height={16} />, text: 'Free Action', color: 'text-gold' };
    }
    if (type === 'call_player' || type === 'call_roll') {
      const player = players.find(p => p.id === target);
      const name = player?.name || 'Someone';
      const isMe = target === playerId;
      return {
        icon: <Target width={16} height={16} />,
        text: isMe ? 'YOUR TURN!' : `${name}'s turn`,
        color: isMe ? 'text-gold animate-pulse' : 'text-magic',
      };
    }
    return { icon: <Clock width={16} height={16} />, text: 'Waiting...', color: 'text-dungeon-300' };
  };

  const info = getTurnDescription();

  return (
    <div className={`flex items-center gap-2 text-mono ${info.color}`}>
      {info.icon}
      <span className="text-sm font-bold">{info.text}</span>
    </div>
  );
}
