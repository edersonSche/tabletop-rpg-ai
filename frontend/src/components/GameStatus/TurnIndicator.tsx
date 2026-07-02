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
  const getTurnDescription = (): { icon: ReactNode; text: string } => {
    if (!type || type === 'narration_only') {
      return { icon: <BookOpen width={16} height={16} className="text-gold shrink-0" />, text: 'Narrative' };
    }
    if (type === 'group_action') {
      return { icon: <Sword width={16} height={16} className="text-gold shrink-0" />, text: 'Free Action' };
    }
    if (type === 'call_player' || type === 'call_roll') {
      const player = players.find(p => p.id === target);
      const name = player?.name || 'Someone';
      const isMe = target === playerId;
      return {
        icon: <Target width={16} height={16} className="text-gold shrink-0" />,
        text: isMe ? 'YOUR TURN!' : `${name}'s turn`,
      };
    }
    return { icon: <Clock width={16} height={16} className="text-gold shrink-0" />, text: 'Waiting...' };
  };

  const info = getTurnDescription();

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-mono text-dungeon-50">
      {info.icon}
      <span className="text-sm font-bold">{info.text}</span>
    </div>
  );
}
