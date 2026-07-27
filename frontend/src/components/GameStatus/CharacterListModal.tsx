import { Play, Circle, Close } from 'pixelarticons/react';
import { Player } from '../../types/game.types';

interface CharacterListModalProps {
  players: Player[];
  currentTurn: string | null;
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterListModal({ players, currentTurn, playerId, isOpen, onClose }: CharacterListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="pixel-border-ornate bg-panel-950 w-full max-w-sm mx-4 p-5 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-stone-600 hover:text-stone-300 transition-colors">
          <Close width={16} height={16} />
        </button>

        <div className="panel-header">
          <h2 className="font-pixel text-[13px] text-gold-400 tracking-wider text-shadow-glow-gold">PARTY MEMBERS</h2>
        </div>

        <div className="space-y-1.5">
          {players.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 pixel-border transition-all ${
                p.id === currentTurn ? 'bg-panel-800 pixel-border-gold' : 'bg-zinc-900'
              }`}
            >
              <span className={p.id === currentTurn ? 'text-cyan-400' : 'text-stone-600'}>
                {p.id === currentTurn ? <Play width={12} height={12} /> : <Circle width={12} height={12} />}
              </span>
              <span className="font-pixel text-[10px] text-stone-300 flex-1">{p.name}</span>
              <span className="font-pixel text-[9px] text-stone-500 mr-1">Lv{p.level}</span>
              {p.id === playerId && (
                <span className="font-pixel text-[8px] text-cyan-400">(YOU)</span>
              )}
            </div>
          ))}
        </div>

        {players.length === 0 && (
          <p className="font-pixel text-[10px] text-stone-600 text-center py-4">NO HEROES HAVE GATHERED YET</p>
        )}
      </div>
    </div>
  );
}
