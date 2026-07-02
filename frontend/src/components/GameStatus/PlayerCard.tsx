import { Play, Circle } from 'pixelarticons/react';

interface PlayerCardProps {
  name: string;
  isActive: boolean;
  isMe: boolean;
  hp: number;
  maxHp: number;
  xp: number;
  maxXp: number;
}

export function PlayerCard({ name, isActive, isMe, hp, maxHp, xp, maxXp }: PlayerCardProps) {
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const xpPct = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;

  return (
    <div className={`p-3 pixel-border transition-all ${
      isActive ? 'bg-dungeon-600 border-gold border' : 'bg-dungeon-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gold text-xs inline-flex items-center">{isActive ? <Play width={12} height={12} /> : <Circle width={12} height={12} />}</span>
        <span className="text-mono text-sm text-dungeon-100 font-bold">{name}</span>
        {isMe && <span className="text-xs text-magic">(you)</span>}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-dungeon-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-blood rounded-full transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <span className="text-mono text-xs text-dungeon-300">{hp}/{maxHp}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-dungeon-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <span className="text-mono text-xs text-dungeon-300">{xp}/{maxXp}</span>
      </div>
    </div>
  );
}
