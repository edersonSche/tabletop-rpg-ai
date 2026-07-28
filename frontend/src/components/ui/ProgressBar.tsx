import { memo } from 'react';

export interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'hp' | 'xp' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

const colorClasses: Record<string, string> = {
  hp: 'bg-gradient-to-r from-blood-700 to-blood-500',
  xp: 'bg-gradient-to-r from-gold-700 to-gold-400',
  cyan: 'bg-gradient-to-r from-cyan-700 to-cyan-400',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2',
};

export const ProgressBar = memo(function ProgressBar({
  value,
  max,
  color = 'hp',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      className={`bg-zinc-900 pixel-border-light overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      <div
        className={`h-full ${colorClasses[color]} bar-segmented transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
});
