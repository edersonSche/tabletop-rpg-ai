import { Box } from 'pixelarticons/react';
import { InventoryItem } from '../../types/game.types';
import { ITEM_TYPE_ICONS } from './constants';

interface ConfirmUseModalProps {
  item: InventoryItem;
  onUse: () => void;
  onClose: () => void;
}

export function ConfirmUseModal({ item, onUse, onClose }: ConfirmUseModalProps) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/80" onClick={onClose}>
      <div className="pixel-border bg-navy-800 max-w-xs w-full mx-4 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-navy-900 pixel-border flex items-center justify-center">
            <TypeIcon width={20} height={20} className="text-gold-400" />
          </div>
          <div>
            <div className="font-pixel text-[9px] text-gold-400">Use {item.name}?</div>
            {item.quantity > 1 && (
              <div className="font-pixel text-[7px] text-stone-600">x{item.quantity}</div>
            )}
          </div>
        </div>

        <div className="font-pixel text-[7px] text-stone-400 mb-4">
          {item.effects?.map((ef, i) => (
            <div key={i} className="mb-1">
              {ef.hpChange?.type === 'heal' && <span>Restores <span className="text-forest-600">{ef.hpChange.formula}</span> HP</span>}
              {ef.hpChange?.type === 'damage' && <span>Deals <span className="text-blood-600">{ef.hpChange.formula}</span> damage</span>}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <button onClick={() => { onUse(); onClose(); }} className="w-full bg-forest-800/50 border border-forest-600/30 pixel-border py-2 font-pixel text-[8px] text-forest-600 hover:bg-forest-700/50 transition-all">
            USE
          </button>
          <button onClick={onClose} className="w-full bg-navy-700 pixel-border py-2 font-pixel text-[8px] text-stone-400 hover:bg-navy-600 transition-all">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
