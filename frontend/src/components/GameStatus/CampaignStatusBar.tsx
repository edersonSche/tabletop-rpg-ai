import { memo } from 'react';
import { LocationBadge } from './LocationBadge';
import { TurnIndicator } from './TurnIndicator';

interface CampaignStatusBarProps {
  location: string | null;
  currentTurn: string | null;
  turnType: string | null;
  turnTarget: string | null;
  players: Array<{ id: string; name: string }>;
  playerId: string;
}

export const CampaignStatusBar = memo(function CampaignStatusBar({ location, currentTurn, turnType, turnTarget, players, playerId }: CampaignStatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-panel-950/90 border-b border-zinc-800">
      <LocationBadge location={location} />
      {location && (currentTurn || turnType) && (
        <div className="w-px h-4 bg-zinc-800" />
      )}
      <TurnIndicator
        currentTurn={currentTurn}
        type={turnType}
        target={turnTarget}
        players={players}
        playerId={playerId}
      />
    </div>
  );
});
