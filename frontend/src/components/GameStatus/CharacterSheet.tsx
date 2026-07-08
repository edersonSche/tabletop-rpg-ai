import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Close, Sword, Target, Heart, BookOpen, Star, Crown, Archive, Shield, Wallet, Box, Potion, Backpack, Human } from 'pixelarticons/react';
import { Player, InventoryItem } from '../../types/game.types';
import { useSocketContext } from '../../hooks/SocketContext';

interface CharacterSheetProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'attributes' | 'inventory';
type SlotKey = 'body' | 'mainHand' | 'offHand';

const ATTRIBUTE_ICONS: Record<keyof Player['attributes'], { label: string; icon: React.ComponentType<{ width?: number; height?: number; className?: string }> }> = {
  strength:     { label: 'Strength',     icon: Sword },
  dexterity:    { label: 'Dexterity',    icon: Target },
  constitution: { label: 'Constitution', icon: Heart },
  intelligence: { label: 'Intelligence', icon: BookOpen },
  wisdom:       { label: 'Wisdom',       icon: Star },
  charisma:     { label: 'Charisma',     icon: Crown },
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

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  weapon: Sword,
  armor: Archive,
  potion: Potion,
  scroll: BookOpen,
  key_item: Star,
  misc: Box,
};

function AttributesTab({ player }: { player: Player }) {
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const xpPct = player.maxXp > 0 ? Math.round((player.xp / player.maxXp) * 100) : 0;

  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-mono text-xs text-dungeon-100">HP</span>
            <span className="text-mono text-xs text-dungeon-100">{player.hp}/{player.maxHp}</span>
          </div>
          <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
            <div className="h-full bg-blood rounded-full transition-all" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div className="w-16 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-mono text-xs text-dungeon-100">AC</span>
            <span className="text-mono text-xs text-gold">{player.ac}</span>
          </div>
          <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
            <div className="h-full bg-magic rounded-full" style={{ width: `${Math.min(100, (player.ac / 30) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-mono text-xs text-dungeon-100">XP</span>
          <span className="text-mono text-xs text-dungeon-100">{player.xp}/{player.maxXp}</span>
        </div>
        <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <h3 className="text-mono text-xs text-dungeon-100 mb-3 tracking-wider">ATTRIBUTES</h3>

      <div className="grid grid-cols-3 gap-2">
        {ATTRIB_KEYS.map((key) => {
          const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
          return (
            <div key={key} className="bg-dungeon-600 p-2 pixel-border text-center">
              <div className="flex items-center justify-center gap-1">
                <Icon width={14} height={14} className="text-gold" />
                <span className="text-mono text-sm text-gold font-bold">{player.attributes[key]}</span>
              </div>
              <div className="text-mono text-[10px] text-dungeon-100 mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ItemCell({ item, isEquipped }: { item: InventoryItem; isEquipped?: boolean }) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div className={`bg-dungeon-600 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-dungeon-500 transition-all ${isEquipped ? 'border-l-2 border-gold' : ''}`}>
      <div className="flex items-center justify-center flex-shrink-0">
        <TypeIcon width={14} height={14} className={isEquipped ? 'text-gold' : 'text-dungeon-100'} />
      </div>
      <div className={`text-mono text-xs flex-1 min-w-0 truncate ${isEquipped ? 'text-gold' : 'text-dungeon-100'}`}>{item.name}</div>
      {item.quantity > 1 && (
        <div className="text-mono text-[10px] text-dungeon-200 flex-shrink-0">x{item.quantity}</div>
      )}
      {isEquipped && (
        <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0" title="Equipped" />
      )}
    </div>
  );
}

function EquipmentCard({ slot, item }: { slot: SlotKey; item: InventoryItem | undefined }) {
  const Icon = SLOT_ICONS[slot];

  if (!item) {
    return (
      <div className="bg-dungeon-600 p-2 pixel-border opacity-50">
        <div className="flex items-center gap-2">
          <Icon width={16} height={16} className="text-dungeon-200" />
          <div className="flex-1 min-w-0">
            <div className="text-mono text-xs text-dungeon-200">Empty</div>
            <div className="text-mono text-[10px] text-dungeon-200 uppercase">{SLOT_LABELS[slot]}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dungeon-600 p-2 pixel-border group hover:bg-dungeon-500 transition-all">
      <div className="flex items-center gap-2">
        <Icon width={16} height={16} className="text-gold" />
        <div className="flex-1 min-w-0">
          <div className="text-mono text-xs text-dungeon-100 truncate">{item.name}</div>
          <div className="text-mono text-[10px] text-dungeon-400 uppercase">{SLOT_LABELS[slot]}</div>
        </div>
      </div>
    </div>
  );
}

function ConfirmUseModal({ item, onUse, onClose }: { item: InventoryItem; onUse: () => void; onClose: () => void }) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-dungeon-900/60" onClick={onClose}>
      <div className="pixel-border bg-dungeon-700 max-w-xs w-full mx-4 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-dungeon-900 rounded pixel-border flex items-center justify-center">
            <TypeIcon width={24} height={24} className="text-gold" />
          </div>
          <div>
            <div className="text-mono text-sm text-gold">Use {item.name}?</div>
            {item.quantity > 1 && (
              <div className="text-mono text-[10px] text-dungeon-200">x{item.quantity}</div>
            )}
          </div>
        </div>

        <div className="text-mono text-xs text-dungeon-100 mb-4">
          {item.effects?.map((ef, i) => (
            <div key={i} className="mb-1">
              {ef.type === 'heal_hp' && <span>Heals <span className="text-blood">{ef.formula}</span> HP.</span>}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <button
            onClick={() => { onUse(); onClose(); }}
            className="w-full bg-blood/80 border border-blood pixel-border py-2 text-mono text-xs text-white hover:brightness-110 transition-all"
          >
            Use
          </button>
          <button
            onClick={onClose}
            className="w-full bg-dungeon-600 pixel-border py-2 text-mono text-xs text-dungeon-100 hover:brightness-110 transition-all"
          >
            Cancel
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
    ? player.equipment.body === item.id ? 'body'
      : player.equipment.mainHand === item.id ? 'mainHand'
      : 'offHand'
    : null;

  const MODIFIER_LABELS: Record<string, string> = {
    ac: 'AC', damage: 'Damage', strength: 'Strength', dexterity: 'Dexterity',
    constitution: 'Constitution', intelligence: 'Intelligence',
    wisdom: 'Wisdom', charisma: 'Charisma', maxHp: 'Max HP',
  };

  return (
    <>
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-dungeon-900 rounded pixel-border flex items-center justify-center">
            <TypeIcon width={20} height={20} className="text-gold" />
          </div>
          <div>
            <div className="text-mono text-sm text-gold">{item.name}</div>
            {item.quantity > 1 && (
              <div className="text-mono text-[10px] text-dungeon-200">x{item.quantity}</div>
            )}
          </div>
        </div>

        <div className="text-mono text-xs text-dungeon-100 mb-3">{item.description}</div>

        {item.modifiers && item.modifiers.length > 0 && (
          <div className="mb-3 p-2 bg-dungeon-900 pixel-border">
            <div className="text-mono text-[10px] text-dungeon-200 mb-1 tracking-wider">MODIFIERS</div>
            {item.modifiers.map((mod, i) => (
              <div key={i} className="text-mono text-xs text-gold flex justify-between">
                <span>{MODIFIER_LABELS[mod.stat] || mod.stat}</span>
                <span>{mod.operation === 'override' ? 'Base ' : ''}{mod.value > 0 ? '+' : ''}{mod.value}{mod.dexCap !== undefined ? ` (DEX max ${mod.dexCap})` : ''}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          {item.effects && item.effects.length > 0 && (
            <button
              onClick={() => setConfirmUse(true)}
              className="w-full bg-blood/20 border border-blood pixel-border py-1.5 text-mono text-xs text-blood hover:brightness-110 transition-all"
            >
              Use
            </button>
          )}

          {isEquipped ? (
            <button
              onClick={() => { onUnequip(equippedSlot!); onClose(); }}
              className="w-full bg-gold/20 border border-gold pixel-border py-1.5 text-mono text-xs text-gold hover:brightness-110 transition-all"
            >
              Unequip ({SLOT_LABELS[equippedSlot!]})
            </button>
          ) : (
            <>
              {item.slot === 'body' && (
                <button
                  onClick={() => { onEquip(item.id, 'body'); onClose(); }}
                  className="w-full bg-gold/20 border border-gold pixel-border py-1.5 text-mono text-xs text-gold hover:brightness-110 transition-all"
                >
                  Equip (Body)
                </button>
              )}
              {item.slot === 'two-handed' && (
                <button
                  onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }}
                  className="w-full bg-gold/20 border border-gold pixel-border py-1.5 text-mono text-xs text-gold hover:brightness-110 transition-all"
                >
                  Equip (2-Handed)
                </button>
              )}
              {item.slot === 'hand' && (
                <>
                  <button
                    onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }}
                    className="w-full bg-gold/20 border border-gold pixel-border py-1.5 text-mono text-xs text-gold hover:brightness-110 transition-all"
                  >
                    Equip (Main Hand)
                  </button>
                  <button
                    onClick={() => { onEquip(item.id, 'offHand'); onClose(); }}
                    className="w-full bg-gold/20 border border-gold pixel-border py-1.5 text-mono text-xs text-gold hover:brightness-110 transition-all"
                  >
                    Equip (Off Hand)
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {confirmUse && (
        <ConfirmUseModal
          item={item}
          onUse={() => { onUseItem(item.id); onClose(); }}
          onClose={() => setConfirmUse(false)}
        />
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

      if (!insideTrigger && !insidePopup) {
        setIsOpen(false);
      }
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
        <div
          ref={popupRef}
          className="fixed z-[60]"
          style={{ top: pos.top, left: pos.left, width: '256px' }}
        >
          <div className="pixel-border bg-dungeon-700 shadow-lg border border-dungeon-500">
            <ItemPopupContent
              item={item}
              player={player}
              onEquip={onEquip}
              onUnequip={onUnequip}
              onUseItem={onUseItem}
              onClose={() => setIsOpen(false)}
            />
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

  const wrapHover = (item: InventoryItem | undefined, card: React.ReactNode) => {
    if (!item) return card;
    return (
      <HoverItemPopup item={item} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
        {card}
      </HoverItemPopup>
    );
  };

  const equippedIds = new Set(
    Object.values(player.equipment).filter(Boolean) as string[]
  );

  return (
    <div className="flex gap-3 min-h-0 mb-2">
      <div className="flex-1 min-w-0">
        <h3 className="text-mono text-xs text-dungeon-100 mb-2 tracking-wider">ITEMS</h3>
        {player.inventory.length === 0 ? (
          <p className="text-mono text-xs text-dungeon-200 text-center py-4">No items</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {player.inventory.map(item => (
              <HoverItemPopup key={item.id} item={item} player={player} onEquip={onEquip} onUnequip={onUnequip} onUseItem={onUseItem}>
                <ItemCell item={item} isEquipped={equippedIds.has(item.id)} />
              </HoverItemPopup>
            ))}
          </div>
        )}
      </div>

      <div className="w-36 flex-shrink-0">
        <h3 className="text-mono text-xs text-dungeon-100 mb-2 tracking-wider">EQUIPPED</h3>
        <div className="space-y-1.5">
          {wrapHover(bodyItem, <EquipmentCard slot="body" item={bodyItem} />)}
          {wrapHover(mainHandItem, <EquipmentCard slot="mainHand" item={mainHandItem} />)}
          {wrapHover(offHandItem, <EquipmentCard slot="offHand" item={offHandItem} />)}
        </div>
      </div>
    </div>
  );
}

export function CharacterSheet({ player, isOpen, onClose }: CharacterSheetProps) {
  const [tab, setTab] = useState<Tab>('attributes');
  const { emitEquip, emitUnequip, emitUseItem } = useSocketContext();

  if (!isOpen || !player) return null;

  const handleEquip = (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => {
    emitEquip(itemId, slot);
  };

  const handleUnequip = (slot: SlotKey) => {
    emitUnequip(slot);
  };

  const handleUseItem = (itemId: string) => {
    emitUseItem(itemId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-dungeon-700 w-full max-w-lg mx-4 relative max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-mono text-lg text-gold">{player.name}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Wallet width={14} height={14} className="text-gold" />
                <span className="text-mono text-xs text-gold">{player.coins}</span>
              </div>
              <button
                onClick={onClose}
                className="text-dungeon-100 hover:text-dungeon-100 transition-colors"
              >
                <Close width={18} height={18} />
              </button>
            </div>
          </div>
          <p className="text-mono text-xs text-dungeon-100 mb-3">Level {player.level}</p>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-dungeon-600">
            <button
              onClick={() => setTab('attributes')}
              className={`px-4 py-2 text-mono text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                tab === 'attributes'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-dungeon-300 hover:text-dungeon-100'
              }`}
            >
              <Star width={14} height={14} />
              Attributes
            </button>
            <button
              onClick={() => setTab('inventory')}
              className={`px-4 py-2 text-mono text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                tab === 'inventory'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-dungeon-300 hover:text-dungeon-100'
              }`}
            >
              <Backpack width={14} height={14} />
              Inventory
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto">
          {tab === 'attributes' && <AttributesTab player={player} />}
          {tab === 'inventory' && (
            <InventoryTab
              player={player}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              onUseItem={handleUseItem}
            />
          )}
        </div>
      </div>
    </div>
  );
}
