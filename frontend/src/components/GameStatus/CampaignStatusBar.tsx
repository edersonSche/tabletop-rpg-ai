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

export function CampaignStatusBar({ location, currentTurn, turnType, turnTarget, players, playerId }: CampaignStatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-dungeon-900 border-b border-dungeon-600">
      <LocationBadge location={location} />
      {location && (currentTurn || turnType) && (
        <div className="w-px h-4 bg-dungeon-600" />
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
}
