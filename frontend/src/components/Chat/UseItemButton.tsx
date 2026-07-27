import { useState, useRef, useEffect } from 'react';
import { Potion } from 'pixelarticons/react';
import { InventoryItem } from '../../types/game.types';
import { ConfirmUseModal } from '../shared/ConfirmUseModal';

interface UseItemButtonProps {
  items: InventoryItem[];
  onUseItem: (itemId: string) => void;
}

export function UseItemButton({ items, onUseItem }: UseItemButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<InventoryItem | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const usableItems = items.filter(i => i.effects?.some(e => e.hpChange));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (usableItems.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setConfirmItem(null); }}
        className="w-11 h-11 flex items-center justify-center bg-panel-800 text-gold-400 pixel-border hover:bg-panel-700 hover:shadow-glow-gold transition-all shrink-0"
      >
        <Potion width={18} height={18} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-panel-900 pixel-border-ornate z-50">
          <div className="font-pixel text-[6px] text-stone-500 px-3 py-2 border-b border-zinc-800 tracking-widest">
            CONSUMABLES
          </div>
          {usableItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setOpen(false); setConfirmItem(item); }}
              className="w-full text-left px-3 py-2 font-pixel text-[8px] text-stone-300 hover:bg-panel-800 transition-all flex items-center justify-between"
            >
              <span>{item.name}</span>
              <span className="text-stone-600">x{item.quantity}</span>
            </button>
          ))}
        </div>
      )}

      {confirmItem && (
        <ConfirmUseModal
          item={confirmItem}
          onUse={() => { onUseItem(confirmItem.id); }}
          onClose={() => setConfirmItem(null)}
        />
      )}
    </div>
  );
}
