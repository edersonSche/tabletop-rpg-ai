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
      isActive ? 'bg-navy-700 pixel-border-gold' : 'bg-navy-800'
    }`}>
      <div className="flex items-center gap-2">
        <span className={isActive ? 'text-cyan-400' : 'text-stone-600'}>
          {isActive ? <Play width={10} height={10} /> : <Circle width={10} height={10} />}
        </span>
        <span className="font-pixel text-[8px] text-stone-300 flex-1">{name}</span>
        <span className="font-pixel text-[7px] text-stone-500">Lv{level}</span>
        {isMe && <span className="font-pixel text-[6px] text-cyan-400">(YOU)</span>}
      </div>
    </div>
  );
}
