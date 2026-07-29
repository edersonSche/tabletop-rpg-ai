import { Box } from 'pixelarticons/react';
import { InventoryItem } from '../../types/game.types';
import { ITEM_TYPE_ICONS } from './constants';
import { Modal, Button } from '../ui';

interface ConfirmUseModalProps {
  item: InventoryItem;
  onUse: () => void;
  onClose: () => void;
}

export function ConfirmUseModal({ item, onUse, onClose }: ConfirmUseModalProps) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="xs" className="p-4" showCloseButton={false}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-zinc-900 pixel-border flex items-center justify-center">
          <TypeIcon width={20} height={20} className="text-gold-400" />
        </div>
        <div>
          <div className="font-pixel text-xs text-gold-400">Use {item.name}?</div>
          {item.quantity > 1 && (
            <div className="font-pixel text-xs text-stone-600">x{item.quantity}</div>
          )}
        </div>
      </div>

      <div className="font-pixel text-xs text-stone-400 mb-4">
        {item.effects?.map((ef, i) => (
          <div key={i} className="mb-1">
            {ef.hpChange?.type === 'heal' && <span>Restores <span className="text-forest-600">{ef.hpChange.formula}</span> HP</span>}
            {ef.hpChange?.type === 'damage' && <span>Deals <span className="text-blood-600">{ef.hpChange.formula}</span> damage</span>}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Button onClick={() => { onUse(); onClose(); }} fullWidth>
          USE
        </Button>
        <Button onClick={onClose} variant="secondary" fullWidth>
          CANCEL
        </Button>
      </div>
    </Modal>
  );
}
