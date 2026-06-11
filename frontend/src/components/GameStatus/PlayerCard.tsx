import { Play, Circle } from 'pixelarticons/react';

interface PlayerCardProps {
  name: string;
  isActive: boolean;
  isMe: boolean;
}

export function PlayerCard({ name, isActive, isMe }: PlayerCardProps) {
  return (
    <div className={`p-3 pixel-border transition-all ${
      isActive ? 'bg-parchment-300 dark:bg-dungeon-600 border-gold border' : 'bg-parchment-100 dark:bg-dungeon-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gold text-xs inline-flex items-center">{isActive ? <Play width={12} height={12} /> : <Circle width={12} height={12} />}</span>
        <span className="text-mono text-sm text-parchment-800 dark:text-dungeon-100 font-bold">{name}</span>
        {isMe && <span className="text-xs text-magic">(you)</span>}
      </div>
    </div>
  );
}
