import { Sword, Play, Logout } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';
import { Header } from '../components/Layout/Header';

export function WaitingRoom() {
  const { player, gameState, startCampaign, leaveRoom, isAiProcessing } = useSocket();

  const isCreator = player.playerId === gameState?.creatorId;

  return (
    <div className="h-screen flex flex-col bg-dungeon-800">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-3 mb-6">
          <Sword width={28} height={28} className="text-gold" />
          <h2 className="text-pixel text-2xl text-gold">{gameState?.campaignName || 'Campaign'}</h2>
        </div>

        <div className="pixel-border bg-dungeon-700/50 p-4 mb-6 text-center w-full max-w-md">
          <p className="text-mono text-sm text-dungeon-300 mb-1">Share this code with your friends:</p>
          <p className="text-pixel text-3xl text-gold tracking-widest select-all">{player.roomId}</p>
        </div>

        <div className="pixel-border bg-dungeon-700 p-6 w-full max-w-md">
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
            onClick={startCampaign}
            disabled={isAiProcessing}
            className="bg-gold text-dungeon-900 py-3 px-8 text-mono text-lg pixel-border hover:brightness-110 transition-all mt-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play width={16} height={16} />
            START CAMPAIGN
          </button>
        )}

        <button
          onClick={leaveRoom}
          disabled={isAiProcessing}
          className="text-mono text-sm text-blood hover:text-blood/80 transition-colors mt-4 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Logout width={14} height={14} />
          {isCreator ? 'Close campaign' : 'Leave campaign'}
        </button>
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
