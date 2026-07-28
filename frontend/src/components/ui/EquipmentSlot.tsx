import { memo } from 'react';
import { Human, Sword, Shield } from 'pixelarticons/react';
import type { InventoryItem } from '../../types/game.types';

type SlotKey = 'body' | 'mainHand' | 'offHand';

const SLOT_ICONS: Record<SlotKey, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  body: Human,
  mainHand: Sword,
  offHand: Shield,
};

const SLOT_LABELS: Record<SlotKey, string> = {
  body: 'Body',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
};

interface EquipmentSlotProps {
  slot: SlotKey;
  item?: InventoryItem;
  className?: string;
}

export const EquipmentSlot = memo(function EquipmentSlot({
  slot,
  item,
  className = '',
}: EquipmentSlotProps) {
  const Icon = SLOT_ICONS[slot];

  if (!item) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 p-2 opacity-40 ${className}`}>
        <div className="flex items-center gap-2">
          <Icon width={14} height={14} className="text-stone-700" />
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[8px] text-stone-600">Empty</div>
            <div className="font-pixel text-[8px] text-stone-700 uppercase">{SLOT_LABELS[slot]}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 p-2 group hover:bg-panel-800 transition-all ${className}`}>
      <div className="flex items-center gap-2">
        <Icon width={14} height={14} className="text-gold-400" />
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[9px] text-stone-300 truncate">{item.name}</div>
          <div className="font-pixel text-[8px] text-stone-600 uppercase">{SLOT_LABELS[slot]}</div>
        </div>
      </div>
    </div>
  );
});
