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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80" onClick={onClose}>
      <div className="pixel-border bg-dungeon-700 w-full max-w-sm mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-dungeon-100 hover:text-dungeon-100 transition-colors"
        >
          <Close width={18} height={18} />
        </button>

        <h2 className="text-pixel text-xs text-gold mb-4 tracking-wider">CHARACTERS</h2>

        <div className="space-y-2">
          {players.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 pixel-border ${
                p.id === currentTurn ? 'bg-dungeon-600 border-gold border' : 'bg-dungeon-800'
              }`}
            >
              <span className="text-gold text-xs inline-flex items-center">
                {p.id === currentTurn ? <Play width={14} height={14} /> : <Circle width={14} height={14} />}
              </span>
              <span className="text-mono text-sm text-dungeon-100 font-bold flex-1">{p.name}</span>
              {p.id === playerId && (
                <span className="text-xs text-magic">(you)</span>
              )}
            </div>
          ))}
        </div>

        {players.length === 0 && (
          <p className="text-mono text-sm text-dungeon-100 text-center">No characters yet.</p>
        )}
      </div>
    </div>
  );
}
