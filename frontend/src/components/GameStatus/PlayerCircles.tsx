interface PlayerCirclesProps {
  players: Array<{ id: string; name: string }>;
  currentTurn: string | null;
}

export function PlayerCircles({ players, currentTurn }: PlayerCirclesProps) {
  return (
    <div className="flex items-center gap-1.5">
      {players.map(p => (
        <div
          key={p.id}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-mono text-[10px] font-bold transition-all bg-dungeon-700 text-dungeon-100 ${
            p.id === currentTurn
              ? 'ring-2 ring-gold'
              : 'ring-1 ring-dungeon-500'
          }`}
          title={p.name}
        >
          {p.name[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}
