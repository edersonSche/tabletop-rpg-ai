import { useState, useRef, useEffect } from 'react';
import { Potion } from 'pixelarticons/react';
import { InventoryItem } from '../../types/game.types';

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
        setConfirmItem(null);
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
        className="w-12 h-12 flex items-center justify-center bg-dungeon-600 text-gold pixel-border hover:bg-dungeon-500 transition-all"
      >
        <Potion width={20} height={20} />
      </button>

      {open && !confirmItem && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-dungeon-700 pixel-border z-50">
          <div className="text-mono text-[10px] text-dungeon-200 px-3 py-2 border-b border-dungeon-600 tracking-wider">
            USE ITEM
          </div>
          {usableItems.map(item => (
            <button
              key={item.id}
              onClick={() => setConfirmItem(item)}
              className="w-full text-left px-3 py-2 text-mono text-xs text-dungeon-100 hover:bg-dungeon-600 transition-all flex items-center justify-between"
            >
              <span>{item.name}</span>
              <span className="text-dungeon-200">x{item.quantity}</span>
            </button>
          ))}
        </div>
      )}

      {open && confirmItem && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-dungeon-700 pixel-border z-50">
          <div className="px-3 py-3">
            <div className="text-mono text-sm text-gold mb-2">Use {confirmItem.name}?</div>
            <div className="text-mono text-xs text-dungeon-100 mb-3">
              {confirmItem.effects?.map((ef, i) => (
                <div key={i}>
                  {ef.hpChange?.type === 'heal' && <span>Heals <span className="text-blood">{ef.hpChange.formula}</span> HP.</span>}
                  {ef.hpChange?.type === 'damage' && <span>Deals <span className="text-blood">{ef.hpChange.formula}</span> damage.</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onUseItem(confirmItem.id); setOpen(false); setConfirmItem(null); }}
                className="flex-1 bg-blood/80 border border-blood pixel-border py-2 text-mono text-xs text-white hover:brightness-110 transition-all"
              >
                Use
              </button>
              <button
                onClick={() => setConfirmItem(null)}
                className="flex-1 bg-dungeon-600 pixel-border py-2 text-mono text-xs text-dungeon-100 hover:brightness-110 transition-all"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
