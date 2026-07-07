import { Player } from '../../types/game.types';

interface MyCharacterStatusProps {
  player: Player;
}

export function MyCharacterStatus({ player }: MyCharacterStatusProps) {
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const xpPct = player.maxXp > 0 ? Math.round((player.xp / player.maxXp) * 100) : 0;

  return (
    <div className="p-3 pixel-border bg-dungeon-700">
      <div className="mb-2">
        <h3 className="text-mono text-sm text-magic font-bold">{player.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-mono text-[10px] text-dungeon-100">Level {player.level}</p>
          <span className="text-mono text-[10px] text-gold">{player.coins} coins</span>
        </div>
      </div>

      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-mono text-[10px] text-dungeon-100">HP</span>
          <span className="text-mono text-[10px] text-dungeon-100">{player.hp}/{player.maxHp}</span>
        </div>
        <div className="h-2 bg-dungeon-900 rounded-full overflow-hidden pixel-border-light">
          <div
            className="h-full bg-blood rounded-full transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-mono text-[10px] text-dungeon-100">XP</span>
          <span className="text-mono text-[10px] text-dungeon-100">{player.xp}/{player.maxXp}</span>
        </div>
        <div className="h-2 bg-dungeon-900 rounded-full overflow-hidden pixel-border-light">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
