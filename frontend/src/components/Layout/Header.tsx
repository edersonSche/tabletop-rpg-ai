import { memo } from 'react';
import { useAuth } from "../../hooks/useAuth";
import { usePlayer } from "../../hooks/usePlayer";
import { useGame } from "../../hooks/useGame";
import logo from "../../assets/logo.png";

export const Header = memo(function Header() {
  const { connected } = useAuth();
  const { player } = usePlayer();
  const { gameState } = useGame();

  return (
    <header className="card-wood border-b border-wood-500/30 px-4 py-3 relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(154, 91, 50, 0.05) 8px, rgba(154, 91, 50, 0.05) 9px)',
        }}
      />
      <div className="max-w-6xl mx-auto flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img className="max-h-[32px]" src={logo} alt="Tabletop RPG AI" />
          {gameState?.campaignName && (
            <div className="hidden sm:flex flex-col border-l border-wood-500/30 pl-3 ml-1">
              <span className="font-pixel text-[7px] text-gold-500/70 tracking-widest uppercase">
                Campaign
              </span>
              <span className="font-pixel text-[9px] text-gold-300 leading-tight mt-0.5">
                {gameState.campaignName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {gameState?.gameStarted && (
            <span className="font-pixel text-[7px] text-stone-600 hidden sm:inline">
              Room: <span className="text-gold-500 select-all">{player.roomId}</span>
            </span>
          )}

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${connected ? 'bg-cyan-400 animate-crystal-pulse' : 'bg-blood-600'}`} />
            <span
              className={`font-pixel text-[7px] ${connected ? 'text-cyan-400' : 'text-blood-600'}`}
            >
              {connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
});
