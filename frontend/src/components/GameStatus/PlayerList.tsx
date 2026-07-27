import { memo } from 'react';
import { Player } from '../../types/game.types';
import { PlayerCard } from './PlayerCard';

interface PlayerListProps {
  players: Player[];
  currentTurn: string | null;
  playerId: string;
}

export const PlayerList = memo(function PlayerList({ players, currentTurn, playerId }: PlayerListProps) {
  return (
    <div className="space-y-1.5">
      <div className="font-pixel text-[9px] text-stone-500 mb-2 tracking-wider">PARTY</div>
      {players.map(p => (
        <PlayerCard
          key={p.id}
          name={p.name}
          level={p.level}
          isActive={p.id === currentTurn}
          isMe={p.id === playerId}
        />
      ))}
    </div>
  );
});
