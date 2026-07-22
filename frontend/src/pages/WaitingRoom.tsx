import { useState } from "react";
import { Play, Logout } from "pixelarticons/react";
import { useSocket } from "../hooks/useSocket";
import logo from "../assets/logo.png";

export function WaitingRoom() {
  const { player, gameState, startCampaign, leaveRoom, isAiProcessing } =
    useSocket();
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
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-starfield">
      <div className="absolute inset-0 bg-gradient-navy pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[300px]" src={logo} alt="Tabletop RPG AI" />
        </div>

        {/* Room Code Card */}
        <div className="card-stone p-4 text-center">
          <p className="font-pixel text-[9px] text-stone-400 mb-1">
            {gameState?.campaignName || "Campaign"}
          </p>
          <p className="font-pixel text-[7px] text-stone-600 mb-3">
            SHARE THIS CODE WITH YOUR ALLIES
          </p>
          <div className="bg-navy-900 pixel-border-gold py-3 px-6 inline-block">
            <p className="font-pixel text-[18px] text-gold-400 tracking-[0.3em] select-all text-shadow-glow-gold">
              {player.roomId}
            </p>
          </div>
        </div>

        {/* Connected Players */}
        <div className="card-stone p-5">
          <h3 className="font-pixel text-[9px] text-gold-500 mb-4 text-center tracking-wider">
            GATHERED HEROES ({gameState?.players.length || 0})
          </h3>

          <div className="space-y-2">
            {gameState?.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-navy-800 p-3 pixel-border"
              >
                <div className="w-8 h-8 bg-gold-500 text-navy-900 flex items-center justify-center font-pixel text-[10px] shrink-0">
                  {p.name[0]}
                </div>
                <span className="font-pixel text-[9px] text-stone-300 flex-1">
                  {p.name}
                </span>
                {p.id === player.playerId && (
                  <span className="font-pixel text-[7px] text-cyan-400">(YOU)</span>
                )}
                {p.id === gameState?.creatorId && (
                  <span className="font-pixel text-[6px] text-gold-500 bg-gold-500/10 px-2 py-0.5">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isCreator && (
          <button
            onClick={handleStart}
            disabled={starting || isAiProcessing}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Play width={14} height={14} />
            {starting ? "SUMMONING..." : "BEGIN CAMPAIGN"}
          </button>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleLeave}
            disabled={leaving || isAiProcessing}
            className="font-pixel text-[8px] text-blood-600 hover:text-blood-500 transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <Logout width={12} height={12} />
            {leaving ? 'LEAVING...' : isCreator ? 'DISBAND' : 'DEPART'}
          </button>
        </div>
      </div>

      {isAiProcessing && (
        <div className="fixed inset-0 bg-navy-950/95 flex flex-col items-center justify-center z-50">
          <div className="animate-crystal-pulse mb-4">
            <div className="w-12 h-12 border-2 border-cyan-400/50 rotate-45" />
          </div>
          <p className="font-pixel text-[11px] text-gold-400 text-shadow-glow-gold mb-2">
            SUMMONING THE CAMPAIGN...
          </p>
          <p className="font-pixel text-[7px] text-stone-600">
            The ancient forces are gathering
          </p>
        </div>
      )}
    </div>
  );
}
