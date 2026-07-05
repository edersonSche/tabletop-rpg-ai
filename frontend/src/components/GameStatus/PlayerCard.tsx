import { Play, Circle } from 'pixelarticons/react';

interface PlayerCardProps {
  name: string;
  level: number;
  isActive: boolean;
  isMe: boolean;
}

export function PlayerCard({ name, level, isActive, isMe }: PlayerCardProps) {
  return (
    <div className={`p-2 pixel-border transition-all ${
      isActive ? 'bg-dungeon-600 border-gold border' : 'bg-dungeon-700'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-gold text-xs inline-flex items-center">{isActive ? <Play width={12} height={12} /> : <Circle width={12} height={12} />}</span>
        <span className="text-mono text-sm text-dungeon-100 font-bold">{name}</span>
        <span className="text-mono text-[10px] text-dungeon-100 ml-auto">Lv{level}</span>
        {isMe && <span className="text-xs text-magic">(you)</span>}
      </div>
    </div>
  );
}
