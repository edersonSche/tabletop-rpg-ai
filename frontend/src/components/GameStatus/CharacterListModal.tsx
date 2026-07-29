import { Play, Circle } from 'pixelarticons/react';
import { Player } from '../../types/game.types';
import { Modal, ModalTitle, Badge, EmptyState } from '../ui';

interface CharacterListModalProps {
  players: Player[];
  currentTurn: string | null;
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterListModal({ players, currentTurn, playerId, isOpen, onClose }: CharacterListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" className="p-5">
      <ModalTitle>PARTY MEMBERS</ModalTitle>

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
            <span className="font-pixel text-xs text-stone-300 flex-1">{p.name}</span>
            <span className="font-pixel text-xs text-stone-500 mr-1">Lv{p.level}</span>
            {p.id === playerId && (
              <Badge variant="you">(YOU)</Badge>
            )}
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <EmptyState message="NO HEROES HAVE GATHERED YET" />
      )}
    </Modal>
  );
}
