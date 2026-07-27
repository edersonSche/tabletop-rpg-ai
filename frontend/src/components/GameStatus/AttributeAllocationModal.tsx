import { useState } from 'react';
import { Close, Plus, Minus } from 'pixelarticons/react';
import { Player } from '../../types/game.types';
import { ATTRIBUTE_ICONS, ATTRIB_KEYS } from '../shared/constants';

interface AttributeAllocationModalProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
  onAllocate: (allocations: Record<string, number>) => void;
}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="pixel-border-ornate bg-panel-950 w-full max-w-sm mx-4 p-5 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-stone-600 hover:text-stone-300 transition-colors">
          <Close width={16} height={16} />
        </button>

        <div className="panel-header">
          <h2 className="font-pixel text-[12px] text-gold-400 tracking-wider text-shadow-glow-gold">ABILITY SCORE IMPROVEMENT</h2>
        </div>
        <p className="font-pixel text-[9px] text-stone-400 mb-4 text-center">
          {player.name} &mdash; POINTS: <span className="text-gold-400">{remaining}</span>
        </p>

        <div className="space-y-1.5 mb-5">
          {ATTRIB_KEYS.map((key) => {
            const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
            const baseValue = player.attributes[key];
            const allocated = allocations[key] || 0;
            const currentValue = baseValue + allocated;
            const canInc = remaining > 0 && currentValue < MAX_ATTRIBUTE;
            const canDec = allocated > 0;

            return (
              <div key={key} className="flex items-center gap-2 bg-zinc-900 p-2 pixel-border">
                <Icon width={14} height={14} className="text-gold-400 shrink-0" />
                <span className="font-pixel text-[9px] text-stone-400 w-8">{label}</span>
                <span className="font-pixel text-[9px] text-stone-600 ml-1">{baseValue}</span>
                {allocated > 0 && <span className="font-pixel text-[9px] text-cyan-400">+{allocated}</span>}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleDecrement(key)}
                    disabled={!canDec}
                    className="text-stone-500 hover:text-blood-500 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Minus width={12} height={12} />
                  </button>
                  <span className="font-pixel text-[12px] text-gold-400 font-bold w-6 text-center">{currentValue}</span>
                  <button
                    onClick={() => handleIncrement(key)}
                    disabled={!canInc}
                    className="text-stone-500 hover:text-cyan-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Plus width={12} height={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={totalAllocated === 0}
          className="btn-rpg w-full"
        >
          CONFIRM ({totalAllocated} / {player.pendingAttributePoints})
        </button>
      </div>
    </div>
  );
}
