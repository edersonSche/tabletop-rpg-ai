import { MapPin } from 'pixelarticons/react';

interface LocationBadgeProps {
  location: string | null;
}

export function LocationBadge({ location }: LocationBadgeProps) {
  if (!location) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-mono text-dungeon-50">
      <MapPin width={16} height={16} className="text-gold shrink-0" />
      <span className="text-sm font-bold capitalize">{location}</span>
    </div>
  );
}
