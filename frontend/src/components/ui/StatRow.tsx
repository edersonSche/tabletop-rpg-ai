import { memo } from 'react';
import type { ComponentType } from 'react';

interface StatRowProps {
  icon: ComponentType<{ width?: number; height?: number; className?: string }>;
  iconColor: string;
  label: string;
  value: number;
  barColor?: string;
  max?: number;
}

export const StatRow = memo(function StatRow({
  icon: Icon,
  iconColor,
  label,
  value,
  barColor,
  max,
}: StatRowProps) {
  const pct = barColor && max ? Math.round((value / max) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <Icon width={12} height={12} className={iconColor} />
        <span className="font-pixel text-xs text-stone-500 flex-1">{label}</span>
        <span className="font-pixel text-xs text-stone-300 font-bold">{value}</span>
      </div>
      {barColor && max !== undefined && (
        <div className="h-1.5 bg-zinc-800 mt-1.5 overflow-hidden">
          <div
            className={`h-full ${barColor} bar-segmented transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
});
