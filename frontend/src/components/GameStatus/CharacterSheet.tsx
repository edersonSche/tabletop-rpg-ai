import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Close, Sword, Target, Heart, BookOpen, Star, Crown, Archive, Shield, Wallet, Box, Potion, Backpack, Human, Skull, Fire, Zap, CloudMoon, Moon, Lock, Circle } from 'pixelarticons/react';
import { Player, InventoryItem, ActiveCondition, Effect } from '../../types/game.types';
import { useInventory } from '../../hooks/useInventory';

interface CharacterSheetProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'attributes' | 'inventory';
type SlotKey = 'body' | 'mainHand' | 'offHand';

const ATTRIBUTE_ICONS: Record<keyof Player['attributes'], { label: string; icon: React.ComponentType<{ width?: number; height?: number; className?: string }> }> = {
  strength:     { label: 'STR',     icon: Sword },
  dexterity:    { label: 'DEX',    icon: Target },
  constitution: { label: 'CON', icon: Heart },
  intelligence: { label: 'INT', icon: BookOpen },
  wisdom:       { label: 'WIS',       icon: Star },
  charisma:     { label: 'CHA',     icon: Crown },
};

const ATTRIB_KEYS = Object.keys(ATTRIBUTE_ICONS) as Array<keyof Player['attributes']>;

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

const CONDITION_ICONS: Record<string, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  Poisoned: Skull,
  Burning: Fire,
  Blessed: Star,
  Cursed: Close,
  Stunned: Zap,
  Frozen: CloudMoon,
  Paralyzed: Lock,
  Unconscious: Moon,
};

function ConditionIcon({ condition, className }: { condition: string; className?: string }) {
  const Icon = CONDITION_ICONS[condition] || Circle;
  return <Icon width={12} height={12} className={className || 'text-stone-500'} />;
}

export function EffectRow({ effect, remainingDuration }: { effect: Effect; remainingDuration?: number }) {
  let text = '';
  if (effect.hpChange) {
    const prefix = effect.hpChange.type === 'damage' ? '-' : '+';
    text = `${prefix}${effect.hpChange.formula} HP/turn`;
  }
  if (effect.statModifiers) {
    const modTexts = effect.statModifiers.map(m =>
      `${m.operation === 'override' ? 'Override: ' : ''}${m.value > 0 ? '+' : ''}${m.value} ${m.target.toUpperCase()}${m.dexCap !== undefined ? ` (DEX max ${m.dexCap})` : ''}`
    );
    text = modTexts.join(', ');
  }
  if (!text) return null;

  return (
    <div className="flex justify-between font-pixel text-[6px] text-stone-500 ml-2 mt-0.5">
      <span>{text}</span>
      {remainingDuration !== undefined && remainingDuration > 0 && (
        <span className="text-stone-600">{remainingDuration}t</span>
      )}
    </div>
  );
}

function hasAntidoteInInventory(player: Player, conditionName: string): boolean {
  return player.inventory.some(i => i.antidoteFor === conditionName);
}

function formatDuration(remainingDurations: number[]): string {
  const active = remainingDurations.filter(d => d > 0);
  if (active.length === 0) return '';
  return `${Math.min(...active)}t`;
}

function ActiveConditionsSection({ player, onUseAntidote }: { player: Player; onUseAntidote: (conditionName: string) => void }) {
  const conditions = player.activeConditions?.filter(ac => !ac.isSuppressed) || [];
  if (conditions.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="font-pixel text-[7px] text-stone-500 mb-2 tracking-wider">ACTIVE CONDITIONS</div>
      <div className="space-y-2">
        {conditions.map(ac => (
          <div key={ac.id} className="p-2 bg-navy-900 pixel-border border-l-2 border-blood-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ConditionIcon condition={ac.condition.name} />
                <span className="font-pixel text-[8px] text-blood-500">{ac.condition.name}</span>
              </div>
              <span className="font-pixel text-[6px] text-stone-600">{formatDuration(ac.remainingDurations)}</span>
            </div>
            <div className="font-pixel text-[6px] text-stone-400 mt-1">{ac.condition.description}</div>
            {ac.condition.effects.map((ef, i) => (
              <EffectRow key={i} effect={ef} remainingDuration={ac.remainingDurations[i]} />
            ))}
            {hasAntidoteInInventory(player, ac.condition.name) && (
              <button
                onClick={() => onUseAntidote(ac.condition.name)}
                className="mt-2 w-full bg-forest-800/50 border border-forest-600/30 pixel-border py-1 font-pixel text-[6px] text-forest-600 hover:bg-forest-700/50 transition-all"
              >
                USE ANTIDOTE
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  weapon: Sword,
  armor: Archive,
  potion: Potion,
  scroll: BookOpen,
  key_item: Star,
  misc: Box,
};

function AttributesTab({ player, onUseAntidote }: { player: Player; onUseAntidote: (conditionName: string) => void }) {
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const xpPct = player.maxXp > 0 ? Math.round((player.xp / player.maxXp) * 100) : 0;

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[7px] text-stone-500">HP</span>
            <span className="font-pixel text-[7px] text-stone-400">{player.hp}/{player.maxHp}</span>
          </div>
          <div className="h-2.5 bg-navy-900 pixel-border-light overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blood-700 to-blood-500 transition-all" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div className="w-16 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[7px] text-stone-500">AC</span>
            <span className="font-pixel text-[7px] text-cyan-400">{player.ac}</span>
          </div>
          <div className="h-2.5 bg-navy-900 pixel-border-light overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400" style={{ width: `${Math.min(100, (player.ac / 30) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-pixel text-[7px] text-stone-500">XP</span>
          <span className="font-pixel text-[7px] text-stone-400">{player.xp}/{player.maxXp}</span>
        </div>
        <div className="h-2.5 bg-navy-900 pixel-border-light overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold-700 to-gold-400 transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="font-pixel text-[7px] text-stone-500 mb-2 tracking-wider">ATTRIBUTES</div>
      <div className="grid grid-cols-3 gap-1.5">
        {ATTRIB_KEYS.map((key) => {
          const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
          return (
            <div key={key} className="bg-navy-800 p-2 pixel-border text-center">
              <div className="flex items-center justify-center gap-1">
                <Icon width={12} height={12} className="text-gold-400" />
                <span className="font-pixel text-[10px] text-gold-400 font-bold">{player.attributes[key]}</span>
              </div>
              <div className="font-pixel text-[6px] text-stone-500 mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>

      <ActiveConditionsSection player={player} onUseAntidote={onUseAntidote} />
    </>
  );
}

function ItemCell({ item, isEquipped }: { item: InventoryItem; isEquipped?: boolean }) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div className={`bg-navy-800 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-navy-700 transition-all ${isEquipped ? 'border-l-2 border-gold-400' : ''}`}>
      <div className="flex items-center justify-center flex-shrink-0">
        <TypeIcon width={12} height={12} className={isEquipped ? 'text-gold-400' : 'text-stone-500'} />
      </div>
      <div className={`font-pixel text-[7px] flex-1 min-w-0 truncate ${isEquipped ? 'text-gold-400' : 'text-stone-300'}`}>{item.name}</div>
      {item.quantity > 1 && (
        <div className="font-pixel text-[6px] text-stone-600 flex-shrink-0">x{item.quantity}</div>
      )}
      {isEquipped && (
        <div className="w-1.5 h-1.5 bg-gold-400 flex-shrink-0" />
      )}
    </div>
  );
}

function EquipmentCard({ slot, item }: { slot: SlotKey; item: InventoryItem | undefined }) {
  const Icon = SLOT_ICONS[slot];

  if (!item) {
    return (
      <div className="bg-navy-800 p-2 pixel-border opacity-40">
        <div className="flex items-center gap-2">
          <Icon width={14} height={14} className="text-stone-700" />
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[6px] text-stone-600">Empty</div>
            <div className="font-pixel text-[6px] text-stone-700 uppercase">{SLOT_LABELS[slot]}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 p-2 pixel-border group hover:bg-navy-700 transition-all">
      <div className="flex items-center gap-2">
        <Icon width={14} height={14} className="text-gold-400" />
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[7px] text-stone-300 truncate">{item.name}</div>
          <div className="font-pixel text-[6px] text-stone-600 uppercase">{SLOT_LABELS[slot]}</div>
        </div>
      </div>
    </div>
  );
}

function ConfirmUseModal({ item, onUse, onClose }: { item: InventoryItem; onUse: () => void; onClose: () => void }) {
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

function ItemPopupContent({ item, player, onEquip, onUnequip, onUseItem, onClose }: {
  item: InventoryItem;
  player: Player;
  onEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void;
  onUnequip: (slot: SlotKey) => void;
  onUseItem: (itemId: string) => void;
  onClose: () => void;
}) {
  const [confirmUse, setConfirmUse] = useState(false);
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;
  const isEquipped = player.equipment.body === item.id || player.equipment.mainHand === item.id || player.equipment.offHand === item.id;
  const equippedSlot: SlotKey | null = isEquipped
    ? player.equipment.body === item.id ? 'body' : player.equipment.mainHand === item.id ? 'mainHand' : 'offHand'
    : null;

  return (
    <>
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-navy-900 pixel-border flex items-center justify-center">
            <TypeIcon width={18} height={18} className="text-gold-400" />
          </div>
          <div>
            <div className="font-pixel text-[8px] text-gold-400">{item.name}</div>
            {item.quantity > 1 && <div className="font-pixel text-[6px] text-stone-600">x{item.quantity}</div>}
          </div>
        </div>

        <div className="font-pixel text-[7px] text-stone-400 mb-3">{item.description}</div>

        {item.effects && item.effects.length > 0 && (
          <div className="mb-3 p-2 bg-navy-900 pixel-border">
            <div className="font-pixel text-[6px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
            {item.effects.map((ef, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex justify-between items-center">
                  <span className="font-pixel text-[6px] text-stone-600">
                    {ef.type === 'immediate' ? 'Instant' : ef.type === 'temporary' ? 'Temporary' : 'Permanent'}
                    {ef.duration ? ` (${ef.duration}t)` : ''}
                  </span>
                  <span className="font-pixel text-[6px] text-stone-600">{ef.origin}</span>
                </div>
                <EffectRow effect={ef} />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          {item.effects && item.effects.some(e => e.type === 'immediate') && (
            <button onClick={() => setConfirmUse(true)} className="w-full bg-blood-700/30 border border-blood-600/30 pixel-border py-1.5 font-pixel text-[7px] text-blood-500 hover:bg-blood-700/50 transition-all">
              USE
            </button>
          )}

          {isEquipped ? (
            <button onClick={() => { onUnequip(equippedSlot!); onClose(); }} className="w-full bg-gold-500/15 border border-gold-500/25 pixel-border py-1.5 font-pixel text-[7px] text-gold-400 hover:bg-gold-500/25 transition-all">
              UNEQUIP ({SLOT_LABELS[equippedSlot!]})
            </button>
          ) : (
            <>
              {item.slot === 'body' && (
                <button onClick={() => { onEquip(item.id, 'body'); onClose(); }} className="w-full bg-gold-500/15 border border-gold-500/25 pixel-border py-1.5 font-pixel text-[7px] text-gold-400 hover:bg-gold-500/25 transition-all">
                  EQUIP (BODY)
                </button>
              )}
              {item.slot === 'two-handed' && (
                <button onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }} className="w-full bg-gold-500/15 border border-gold-500/25 pixel-border py-1.5 font-pixel text-[7px] text-gold-400 hover:bg-gold-500/25 transition-all">
                  EQUIP (2-HANDED)
                </button>
              )}
              {item.slot === 'hand' && (
                <>
                  <button onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }} className="w-full bg-gold-500/15 border border-gold-500/25 pixel-border py-1.5 font-pixel text-[7px] text-gold-400 hover:bg-gold-500/25 transition-all">
                    EQUIP (MAIN HAND)
                  </button>
                  <button onClick={() => { onEquip(item.id, 'offHand'); onClose(); }} className="w-full bg-gold-500/15 border border-gold-500/25 pixel-border py-1.5 font-pixel text-[7px] text-gold-400 hover:bg-gold-500/25 transition-all">
                    EQUIP (OFF HAND)
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {confirmUse && (
        <ConfirmUseModal item={item} onUse={() => { onUseItem(item.id); onClose(); }} onClose={() => setConfirmUse(false)} />
      )}
    </>
  );
}

function HoverItemPopup({ item, player, onEquip, onUnequip, onUseItem, children }: {
  item: InventoryItem;
  player: Player;
  onEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void;
  onUnequip: (slot: SlotKey) => void;
  onUseItem: (itemId: string) => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;

    const onMouseMove = (e: MouseEvent) => {
      const tr = trigger.getBoundingClientRect();
      const pr = popup.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      const insideTrigger = x >= tr.left && x <= tr.right && y >= tr.top && y <= tr.bottom;
      const insidePopup = x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom;
      if (!insideTrigger && !insidePopup) setIsOpen(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [isOpen]);

  const handleMouseEnter = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.bottom, left: rect.left });
    }
    setIsOpen(true);
  };

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter}>
      {children}
      {isOpen && createPortal(
        <div ref={popupRef} className="fixed z-[60]" style={{ top: pos.top, left: pos.left, width: '256px' }}>
          <div className="pixel-border bg-navy-800 shadow-lg border border-stone-700/20">
            <ItemPopupContent item={item} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem} onClose={() => setIsOpen(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function InventoryTab({ player, onEquip, onUnequip, onUseItem }: { player: Player; onEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void; onUnequip: (slot: SlotKey) => void; onUseItem: (itemId: string) => void }) {
  const equipItem = (slot: SlotKey): InventoryItem | undefined => {
    const id = player.equipment[slot];
    return id ? player.inventory.find(i => i.id === id) : undefined;
  };

  const bodyItem = equipItem('body');
  const mainHandItem = equipItem('mainHand');
  const offHandItem = equipItem('offHand');

  const equippedIds = new Set(Object.values(player.equipment).filter(Boolean) as string[]);

  return (
    <div className="flex gap-3 min-h-0 mb-2">
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[7px] text-stone-500 mb-2 tracking-wider">ITEMS</div>
        {player.inventory.length === 0 ? (
          <p className="font-pixel text-[7px] text-stone-600 text-center py-4">YOUR POUCH IS EMPTY</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-quest">
            {player.inventory.map(item => (
              <HoverItemPopup key={item.id} item={item} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
                <ItemCell item={item} isEquipped={equippedIds.has(item.id)} />
              </HoverItemPopup>
            ))}
          </div>
        )}
      </div>

      <div className="w-36 flex-shrink-0">
        <div className="font-pixel text-[7px] text-stone-500 mb-2 tracking-wider">EQUIPPED</div>
        <div className="space-y-1.5">
          {!bodyItem ? <EquipmentCard slot="body" item={bodyItem} /> : (
            <HoverItemPopup item={bodyItem} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
              <EquipmentCard slot="body" item={bodyItem} />
            </HoverItemPopup>
          )}
          {!mainHandItem ? <EquipmentCard slot="mainHand" item={mainHandItem} /> : (
            <HoverItemPopup item={mainHandItem} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
              <EquipmentCard slot="mainHand" item={mainHandItem} />
            </HoverItemPopup>
          )}
          {!offHandItem ? <EquipmentCard slot="offHand" item={offHandItem} /> : (
            <HoverItemPopup item={offHandItem} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
              <EquipmentCard slot="offHand" item={offHandItem} />
            </HoverItemPopup>
          )}
        </div>
      </div>
    </div>
  );
}

export function CharacterSheet({ player, isOpen, onClose }: CharacterSheetProps) {
  const [tab, setTab] = useState<Tab>('attributes');
  const { emitEquip, emitUnequip, emitUseItem, emitUseAntidote } = useInventory();

  if (!isOpen || !player) return null;

  const handleEquip = (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => emitEquip(itemId, slot);
  const handleUnequip = (slot: SlotKey) => emitUnequip(slot);
  const handleUseItem = (itemId: string) => emitUseItem(itemId);
  const handleUseAntidote = (conditionName: string) => {
    const item = player.inventory.find(i => i.antidoteFor === conditionName);
    if (item) emitUseAntidote(item.id, conditionName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80" onClick={onClose}>
      <div className="pixel-border bg-navy-800 w-full max-w-lg mx-4 relative max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-pixel text-[11px] text-gold-400 text-shadow-glow-gold">{player.name}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Wallet width={12} height={12} className="text-gold-400" />
                <span className="font-pixel text-[8px] text-gold-400">{player.coins}</span>
              </div>
              <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
                <Close width={16} height={16} />
              </button>
            </div>
          </div>
          <p className="font-pixel text-[7px] text-stone-500 mb-3">LEVEL {player.level}</p>

          <div className="flex gap-1 border-b border-stone-700/20">
            <SheetTab active={tab === 'attributes'} onClick={() => setTab('attributes')} icon={<Star width={12} height={12} />}>
              Stats
            </SheetTab>
            <SheetTab active={tab === 'inventory'} onClick={() => setTab('inventory')} icon={<Backpack width={12} height={12} />}>
              Inventory
            </SheetTab>
          </div>
        </div>

        <div className="p-4 overflow-y-auto scrollbar-quest">
          {tab === 'attributes' && <AttributesTab player={player} onUseAntidote={handleUseAntidote} />}
          {tab === 'inventory' && <InventoryTab player={player} onEquip={handleEquip} onUnequip={handleUnequip} onUseItem={handleUseItem} />}
        </div>
      </div>
    </div>
  );
}

function SheetTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-pixel text-[7px] tracking-wider transition-all flex items-center gap-1.5 ${
        active ? 'text-gold-400 border-b-2 border-gold-400' : 'text-stone-600 hover:text-stone-400'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
