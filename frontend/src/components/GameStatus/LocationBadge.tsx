import { memo } from 'react';
import { MapPin } from 'pixelarticons/react';

interface LocationBadgeProps {
  location: string | null;
}

export const LocationBadge = memo(function LocationBadge({ location }: LocationBadgeProps) {
  if (!location) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-700/50 pixel-border-light">
      <MapPin width={12} height={12} className="text-gold-400 shrink-0" />
      <span className="font-pixel text-[8px] text-stone-300 tracking-wider">{location}</span>
    </div>
  );
});
