import { Close } from 'pixelarticons/react';
import { Player } from '../../types/game.types';

interface CharacterSheetProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const ATTRIBUTE_LABELS: Record<keyof Player['attributes'], string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

export function CharacterSheet({ player, isOpen, onClose }: CharacterSheetProps) {
  if (!isOpen || !player) return null;

  const attributes = player.attributes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-dungeon-700 w-full max-w-sm mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-dungeon-300 hover:text-dungeon-100 transition-colors"
        >
          <Close width={18} height={18} />
        </button>

        <h2 className="text-mono text-lg text-gold text-center mb-6">{player.name}</h2>

        <div className="space-y-3">
          {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof Player['attributes']>).map((key) => (
            <div key={key} className="flex items-center justify-between bg-dungeon-600 p-3 pixel-border">
              <span className="text-mono text-sm text-dungeon-100">{ATTRIBUTE_LABELS[key]}</span>
              <span className="text-mono text-lg text-gold font-bold">{attributes[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
