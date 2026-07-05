import { useState } from 'react';
import { Close, Plus, Minus, Sword, Target, Heart, BookOpen, Star, Crown } from 'pixelarticons/react';
import { Player } from '../../types/game.types';

interface AttributeAllocationModalProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
  onAllocate: (allocations: Record<string, number>) => void;
}

const ATTRIBUTE_ICONS: Record<keyof Player['attributes'], { label: string; icon: React.ComponentType<{ width?: number; height?: number; className?: string }> }> = {
  strength:     { label: 'Strength',     icon: Sword },
  dexterity:    { label: 'Dexterity',    icon: Target },
  constitution: { label: 'Constitution', icon: Heart },
  intelligence: { label: 'Intelligence', icon: BookOpen },
  wisdom:       { label: 'Wisdom',       icon: Star },
  charisma:     { label: 'Charisma',     icon: Crown },
};

const ATTRIB_KEYS = Object.keys(ATTRIBUTE_ICONS) as Array<keyof Player['attributes']>;
const MAX_ATTRIBUTE = 20;

export function AttributeAllocationModal({ player, isOpen, onClose, onAllocate }: AttributeAllocationModalProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  if (!isOpen || !player) return null;

  const handleIncrement = (key: string) => {
    const current = player.attributes[key as keyof Player['attributes']] + (allocations[key] || 0);
    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
    if (totalAllocated >= player.pendingAttributePoints) return;
    if (current >= MAX_ATTRIBUTE) return;
    setAllocations(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const handleDecrement = (key: string) => {
    if (!allocations[key]) return;
    setAllocations(prev => {
      const next = { ...prev };
      next[key] = next[key] - 1;
      if (next[key] <= 0) delete next[key];
      return next;
    });
  };

  const handleConfirm = () => {
    onAllocate(allocations);
    setAllocations({});
    onClose();
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  const remaining = player.pendingAttributePoints - totalAllocated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80" onClick={onClose}>
      <div className="pixel-border bg-dungeon-700 w-full max-w-sm mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-dungeon-100 hover:text-dungeon-100 transition-colors"
        >
          <Close width={18} height={18} />
        </button>

        <h2 className="text-pixel text-xs text-gold mb-1 tracking-wider">ABILITY SCORE IMPROVEMENT</h2>
        <p className="text-mono text-xs text-dungeon-100 mb-4">
          {player.name} &mdash; Points remaining: <span className="text-gold">{remaining}</span>
        </p>

        <div className="space-y-2 mb-5">
          {ATTRIB_KEYS.map((key) => {
            const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
            const baseValue = player.attributes[key];
            const allocated = allocations[key] || 0;
            const currentValue = baseValue + allocated;
            const canInc = remaining > 0 && currentValue < MAX_ATTRIBUTE;
            const canDec = allocated > 0;

            return (
              <div key={key} className="flex items-center gap-2 bg-dungeon-800 p-2 pixel-border">
                <Icon width={16} height={16} className="text-gold shrink-0" />
                <span className="text-mono text-xs text-dungeon-100 w-24">{label}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleDecrement(key)}
                    disabled={!canDec}
                    className="text-dungeon-100 hover:text-blood transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus width={14} height={14} />
                  </button>
                  <span className="text-mono text-sm text-gold font-bold w-6 text-center">{currentValue}</span>
                  <button
                    onClick={() => handleIncrement(key)}
                    disabled={!canInc}
                    className="text-dungeon-100 hover:text-magic transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus width={14} height={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={totalAllocated === 0}
          className="w-full bg-gold text-dungeon-900 pixel-border py-2 text-mono text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm Allocation ({totalAllocated} / {player.pendingAttributePoints})
        </button>
      </div>
    </div>
  );
}
