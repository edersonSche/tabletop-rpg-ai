import { Sword } from 'pixelarticons/react';
import { useSocket } from '../../hooks/useSocket';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { connected, player, gameState } = useSocket();

  return (
    <header className="bg-parchment-200 dark:bg-dungeon-900 border-b-2 border-gold px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sword width={24} height={24} />
          <h1 className="text-pixel text-sm text-gold hidden sm:block">
            {gameState?.campaignName || 'RPG Tabletop'}
          </h1>
          <h1 className="text-mono text-lg text-gold sm:hidden">
            {gameState?.campaignName || 'RPG'}
          </h1>
        </div>

        <div className="flex items-center gap-4 text-mono text-sm">
          <ThemeToggle />
          {player.roomId && (
            <span className="text-parchment-600 dark:text-dungeon-300">
              Room: <span className="text-gold">{player.roomId}</span>
            </span>
          )}
          <span className={`flex items-center gap-1 ${connected ? 'text-green-400' : 'text-blood'}`}>
            <span className={`w-2 h-2 inline-block ${connected ? 'bg-green-400' : 'bg-blood'} animate-pulse`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
}
