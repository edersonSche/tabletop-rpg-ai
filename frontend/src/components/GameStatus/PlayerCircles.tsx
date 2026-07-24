import { memo } from 'react';

interface PlayerCirclesProps {
  players: Array<{ id: string; name: string }>;
  currentTurn: string | null;
}

export const PlayerCircles = memo(function PlayerCircles({ players, currentTurn }: PlayerCirclesProps) {
  return (
    <div className="flex items-center gap-1.5">
      {players.map(p => (
        <div
          key={p.id}
          className={`w-6 h-6 flex items-center justify-center font-pixel text-[7px] font-bold transition-all ${
            p.id === currentTurn
              ? 'bg-gold-500/20 text-gold-400 pixel-border-gold'
              : 'bg-navy-700 text-stone-400 pixel-border'
          }`}
          title={p.name}
        >
          {p.name[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
});
