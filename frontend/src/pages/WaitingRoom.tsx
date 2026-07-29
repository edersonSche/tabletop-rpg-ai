import { useState } from "react";
import { Play, Logout } from "pixelarticons/react";
import { usePlayer } from "../hooks/usePlayer";
import { useGame } from "../hooks/useGame";
import { Card, Button, PlayerRow, TextButton, LoadingOverlay, SectionTitle } from "../components/ui";
import logo from "../assets/logo.png";

export function WaitingRoom() {
  const { player, leaveRoom } = usePlayer();
  const { gameState, startCampaign, isAiProcessing } = useGame();
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isCreator = player.playerId === gameState?.creatorId;

  const handleStart = () => {
    setStarting(true);
    startCampaign();
    setTimeout(() => setStarting(false), 10000);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveRoom();
    } catch {
      setLeaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-panel-950">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[300px]" src={logo} alt="Tabletop RPG AI" />
        </div>

        {/* Room Code Card */}
        <Card padding="sm" center>
          <p className="font-pixel text-xs text-stone-400 mb-1">
            {gameState?.campaignName || "Campaign"}
          </p>
          <p className="font-pixel text-xs text-stone-600 mb-3">
            SHARE THIS CODE WITH YOUR ALLIES
          </p>
          <div className="bg-zinc-900 pixel-border-gold py-3 px-6 inline-block">
            <p className="font-pixel text-xl text-gold-400 tracking-[0.3em] select-all text-shadow-glow-gold">
              {player.roomId}
            </p>
          </div>
        </Card>

        {/* Connected Players */}
        <Card padding="md">
          <SectionTitle className="text-center mb-4 text-gold-500 text-xs">
            GATHERED HEROES ({gameState?.players.length || 0})
          </SectionTitle>

          <div className="space-y-2">
            {gameState?.players.map((p) => (
              <PlayerRow
                key={p.id}
                name={p.name}
                isYou={p.id === player.playerId}
                isHost={p.id === gameState?.creatorId}
              />
            ))}
          </div>
        </Card>

        {isCreator && (
          <Button
            onClick={handleStart}
            disabled={starting || isAiProcessing}
            fullWidth
            className="flex items-center justify-center gap-2"
          >
            <Play width={14} height={14} />
            {starting ? "SUMMONING..." : "BEGIN CAMPAIGN"}
          </Button>
        )}

        <div className="flex justify-center">
          <TextButton
            onClick={handleLeave}
            disabled={leaving || isAiProcessing}
            icon={<Logout width={12} height={12} />}
            color="blood"
          >
            {leaving ? "LEAVING..." : isCreator ? "DISBAND" : "DEPART"}
          </TextButton>
        </div>
      </div>

      {isAiProcessing && (
        <LoadingOverlay
          title="SUMMONING THE CAMPAIGN..."
          subtitle="The ancient forces are gathering"
        />
      )}
    </div>
  );
}
