import { Sword, Play, Logout } from 'pixelarticons/react';
import { useSocket } from '../hooks/useSocket';
import { Header } from '../components/Layout/Header';

export function WaitingRoom() {
  const { player, gameState, startCampaign, leaveRoom } = useSocket();

  const isCreator = player.playerId === gameState?.creatorId;

  return (
    <div className="h-screen flex flex-col bg-parchment-200 dark:bg-dungeon-800">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-3 mb-6">
          <Sword width={28} height={28} className="text-gold" />
          <h2 className="text-pixel text-2xl text-gold">{gameState?.campaignName || 'Campaign'}</h2>
        </div>

        <div className="pixel-border bg-parchment-100 dark:bg-dungeon-700 p-6 w-full max-w-md">
          <h3 className="text-mono text-base text-gold mb-4 text-center">
            Connected Players ({gameState?.players.length || 0})
          </h3>

          <div className="space-y-2">
            {gameState?.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-parchment-50 dark:bg-dungeon-600 p-3 pixel-border">
                <div className="w-8 h-8 bg-gold text-dungeon-900 flex items-center justify-center text-mono text-sm pixel-border shrink-0">
                  {p.name[0]}
                </div>
                <span className="text-mono text-lg text-parchment-800 dark:text-dungeon-100">
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
            className="bg-gold text-dungeon-900 py-3 px-8 text-mono text-lg pixel-border hover:brightness-110 transition-all mt-6 flex items-center gap-2"
          >
            <Play width={16} height={16} />
            START CAMPAIGN
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="text-mono text-sm text-blood hover:text-blood/80 transition-colors mt-4 flex items-center gap-1"
        >
          <Logout width={14} height={14} />
          {isCreator ? 'Close campaign' : 'Leave campaign'}
        </button>
      </div>
    </div>
  );
}
