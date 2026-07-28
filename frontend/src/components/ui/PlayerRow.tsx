import { memo } from 'react';

interface PlayerRowProps {
  name: string;
  isActive?: boolean;
  isYou?: boolean;
  isHost?: boolean;
  badge?: React.ReactNode;
  avatar?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PlayerRow = memo(function PlayerRow({
  name,
  isActive,
  isYou,
  isHost,
  badge,
  avatar,
  children,
  className = '',
}: PlayerRowProps) {
  return (
    <div
      className={`flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3 ${isActive ? 'pixel-border-gold' : ''} ${className}`}
    >
      <div className="w-8 h-8 bg-bronze-500 text-panel-950 flex items-center justify-center font-pixel text-[12px] shrink-0">
        {avatar || name[0]}
      </div>
      <span className="font-pixel text-[11px] text-stone-300 flex-1">
        {name}
      </span>
      {isYou && <span className="font-pixel text-[9px] text-cyan-400">(YOU)</span>}
      {isHost && <span className="font-pixel text-[8px] text-gold-500 bg-gold-500/10 px-2 py-0.5">HOST</span>}
      {badge}
      {children}
    </div>
  );
});
