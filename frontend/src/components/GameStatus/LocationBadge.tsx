import { MapPin } from 'pixelarticons/react';

interface LocationBadgeProps {
  location: string | null;
}

export function LocationBadge({ location }: LocationBadgeProps) {
  if (!location) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-parchment-100 dark:bg-dungeon-800 border-l-2 border-gold rounded-r-sm text-mono text-xs text-dungeon-800 dark:text-parchment-200">
      <MapPin width={14} height={14} className="text-gold shrink-0" />
      <span className="font-semibold capitalize leading-none truncate">{location}</span>
    </div>
  );
}
