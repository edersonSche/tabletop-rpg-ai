import { Sword, Shield, Heart, Play, Circle } from 'pixelarticons/react';

interface PlayerCardProps {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  isActive: boolean;
  isMe: boolean;
}

export function PlayerCard({ name, hp, maxHp, attack, defense, isActive, isMe }: PlayerCardProps) {
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'text-gold' : 'text-blood';

  return (
    <div className={`p-3 pixel-border transition-all ${
      isActive ? 'bg-parchment-300 dark:bg-dungeon-600 border-gold border' : 'bg-parchment-100 dark:bg-dungeon-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gold text-xs inline-flex items-center">{isActive ? <Play width={12} height={12} /> : <Circle width={12} height={12} />}</span>
        <span className="text-mono text-sm text-parchment-800 dark:text-dungeon-100 font-bold">{name}</span>
        {isMe && <span className="text-xs text-magic">(you)</span>}
      </div>

      <div className="flex items-center gap-1 ml-4 mb-1">
        <span className="text-xs flex items-center"><Heart width={12} height={12} /></span>
        <div className="flex-1 h-3 bg-parchment-200 dark:bg-dungeon-900 pixel-border">
          <div
            className={`h-full ${hpColor} transition-all duration-500`}
            style={{ width: `${hpPercent}%` }}
          ></div>
        </div>
        <span className="text-mono text-xs text-parchment-500 dark:text-dungeon-300">{hp}/{maxHp}</span>
      </div>

      <div className="flex gap-3 ml-4 text-mono text-xs text-parchment-500 dark:text-dungeon-300">
        <span className="flex items-center gap-1"><Sword width={12} height={12} />+{attack}</span>
        <span className="flex items-center gap-1"><Shield width={12} height={12} />+{defense}</span>
      </div>
    </div>
  );
}
