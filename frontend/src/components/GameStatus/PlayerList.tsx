import { Player } from '../../types/game.types';
import { PlayerCard } from './PlayerCard';

interface PlayerListProps {
  players: Player[];
  currentTurn: string | null;
  playerId: string;
}

export function PlayerList({ players, currentTurn, playerId }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-pixel text-xs text-gold mb-3 tracking-wider">CHARACTERS</h3>
      {players.map(p => (
        <PlayerCard
          key={p.id}
          name={p.name}
          isActive={p.id === currentTurn}
          isMe={p.id === playerId}
        />
      ))}
    </div>
  );
}
