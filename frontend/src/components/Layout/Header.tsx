import { Sword } from 'pixelarticons/react';
import { useSocket } from '../../hooks/useSocket';

export function Header() {
  const { connected, player, gameState } = useSocket();

  return (
    <header className="bg-dungeon-900 border-b-2 border-gold px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sword width={24} height={24} />
          <div className="flex flex-col">
            <h1 className="text-pixel text-sm text-gold">RPG TABLETOP</h1>
            {gameState?.campaignName && (
              <span className="text-mono text-xs text-dungeon-100 leading-tight">
                {gameState.campaignName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-mono text-sm">
          <span className={`flex items-center gap-1 ${connected ? 'text-green-400' : 'text-blood'}`}>
            <span className={`w-2 h-2 inline-block ${connected ? 'bg-green-400' : 'bg-blood'} animate-pulse`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
}
