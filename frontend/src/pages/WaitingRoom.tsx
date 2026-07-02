import { useState } from 'react';
import { Sword, Play, Logout } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';

export function WaitingRoom() {
  const { player, gameState, startCampaign, leaveRoom, isAiProcessing } = useSocket();
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
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-pixel text-2xl text-gold mb-2 flex items-center justify-center gap-2">
            <Sword width={24} height={24} />
            <span>RPG TABLETOP</span>
            <Sword width={24} height={24} />
          </h1>
          <p className="text-mono text-dungeon-100 text-lg">Waiting for players...</p>
        </div>

        <div className="pixel-border bg-dungeon-700 p-4 text-center w-full">
          <p className="text-mono text-sm text-dungeon-100 mb-1">{gameState?.campaignName || 'Campaign'}</p>
          <p className="text-mono text-xs text-dungeon-200 mb-2">Share this code with your friends:</p>
          <p className="text-pixel text-3xl text-gold tracking-widest select-all">{player.roomId}</p>
        </div>

        <div className="pixel-border bg-dungeon-500 p-6 w-full">
          <h3 className="text-mono text-base text-gold mb-4 text-center">
            Connected Players ({gameState?.players.length || 0})
          </h3>

          <div className="space-y-2">
            {gameState?.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-dungeon-600 p-3 pixel-border">
                <div className="w-8 h-8 bg-gold text-dungeon-900 flex items-center justify-center text-mono text-sm pixel-border shrink-0">
                  {p.name[0]}
                </div>
                <span className="text-mono text-lg text-dungeon-100">
                  {p.name}
                  {p.id === player.playerId && (
                    <span className="text-gold text-sm ml-2">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isCreator && (
          <button
            onClick={handleStart}
            disabled={starting || isAiProcessing}
            className="w-full bg-gold text-dungeon-900 py-3 px-8 text-mono text-lg pixel-border hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play width={16} height={16} />
            {starting ? 'STARTING...' : 'START CAMPAIGN'}
          </button>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleLeave}
            disabled={leaving || isAiProcessing}
            className="text-mono text-sm text-blood hover:text-blood/80 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Logout width={14} height={14} />
            {leaving ? 'LEAVING...' : (isCreator ? 'Close' : 'Leave')}
          </button>
        </div>
      </div>

      {isAiProcessing && (
        <div className="fixed inset-0 bg-dungeon-900 flex flex-col items-center justify-center z-50">
          <p className="text-pixel text-xl text-gold">
            Loading campaign...
          </p>
        </div>
      )}
    </div>
  );
}
