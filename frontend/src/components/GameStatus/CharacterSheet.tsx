import { useState } from 'react';
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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-mono text-xs text-dungeon-100">HP</span>
          <span className="text-mono text-xs text-dungeon-100">{player.hp}/{player.maxHp}</span>
        </div>
        <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
          <div className="h-full bg-blood rounded-full transition-all" style={{ width: `${hpPct}%` }} />
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

function ItemCell({ item, onHover, onClick }: { item: InventoryItem; onHover: (item: InventoryItem | null) => void; onClick: (item: InventoryItem) => void }) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div
      className="bg-dungeon-600 p-2 pixel-border text-center cursor-pointer hover:bg-dungeon-500 transition-all group"
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(item)}
    >
      <div className="flex items-center justify-center mb-1">
        <TypeIcon width={18} height={18} className="text-dungeon-100" />
      </div>
      <div className="text-mono text-[10px] text-dungeon-100 truncate">{item.name}</div>
      {item.quantity > 1 && (
        <div className="text-mono text-[10px] text-dungeon-200">x{item.quantity}</div>
      )}
    </div>
  );
}

function EquipmentCard({ slot, item, onHover, onClick }: { slot: SlotKey; item: InventoryItem | undefined; onHover: (item: InventoryItem | null) => void; onClick: (item: InventoryItem) => void }) {
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
    <div
      className="bg-dungeon-600 p-2 pixel-border cursor-pointer hover:bg-dungeon-500 transition-all"
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(item)}
    >
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

function ItemPopup({ item, player, onEquip, onUnequip, onClose }: { item: InventoryItem; player: Player; onEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void; onUnequip: (slot: SlotKey) => void; onClose: () => void }) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  const isEquipped = player.equipment.body === item.id || player.equipment.mainHand === item.id || player.equipment.offHand === item.id;

  const equippedSlot: SlotKey | null = isEquipped
    ? player.equipment.body === item.id ? 'body'
      : player.equipment.mainHand === item.id ? 'mainHand'
      : 'offHand'
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-dungeon-900/60"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-dungeon-700 max-w-xs w-full mx-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-dungeon-900 rounded pixel-border flex items-center justify-center">
            <TypeIcon width={24} height={24} className="text-gold" />
          </div>
          <div>
            <div className="text-mono text-sm text-gold">{item.name}</div>
            {item.quantity > 1 && (
              <div className="text-mono text-[10px] text-dungeon-400">x{item.quantity}</div>
            )}
          </div>
        </div>

        <div className="text-mono text-xs text-dungeon-100 mb-4">{item.description}</div>

        <div className="space-y-1.5">
          {isEquipped ? (
            <button
              onClick={() => { onUnequip(equippedSlot!); onClose(); }}
              className="w-full bg-blood/20 border border-blood pixel-border py-2 text-mono text-xs text-blood hover:brightness-110 transition-all"
            >
              Unequip ({SLOT_LABELS[equippedSlot!]})
            </button>
          ) : (
            <>
              {item.slot === 'body' && (
                <button
                  onClick={() => { onEquip(item.id, 'body'); onClose(); }}
                  className="w-full bg-gold/20 border border-gold pixel-border py-2 text-mono text-xs text-gold hover:brightness-110 transition-all"
                >
                  Equip (Body)
                </button>
              )}
              {item.slot === 'two-handed' && (
                <button
                  onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }}
                  className="w-full bg-gold/20 border border-gold pixel-border py-2 text-mono text-xs text-gold hover:brightness-110 transition-all"
                >
                  Equip (2-Handed)
                </button>
              )}
              {item.slot === 'hand' && (
                <>
                  <button
                    onClick={() => { onEquip(item.id, 'mainHand'); onClose(); }}
                    className="w-full bg-gold/20 border border-gold pixel-border py-2 text-mono text-xs text-gold hover:brightness-110 transition-all"
                  >
                    Equip (Main Hand)
                  </button>
                  <button
                    onClick={() => { onEquip(item.id, 'offHand'); onClose(); }}
                    className="w-full bg-gold/20 border border-gold pixel-border py-2 text-mono text-xs text-gold hover:brightness-110 transition-all"
                  >
                    Equip (Off Hand)
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full bg-dungeon-600 pixel-border py-2 text-mono text-xs text-dungeon-100 hover:brightness-110 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ player, onEquip, onUnequip }: { player: Player; onEquip: (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => void; onUnequip: (slot: SlotKey) => void }) {
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const equipItem = (slot: SlotKey): InventoryItem | undefined => {
    const id = player.equipment[slot];
    return id ? player.inventory.find(i => i.id === id) : undefined;
  };

  return (
    <>
      <div className="flex gap-3 min-h-0 mb-2">
        {/* Inventory Items Grid */}
        <div className="flex-1 min-w-0">
          <h3 className="text-mono text-xs text-dungeon-100 mb-2 tracking-wider">ITEMS</h3>
          {player.inventory.length === 0 ? (
            <p className="text-mono text-xs text-dungeon-400 text-center py-4">No items</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {player.inventory.map(item => (
                <ItemCell
                  key={item.id}
                  item={item}
                  onHover={setHoveredItem}
                  onClick={(i) => setSelectedItem(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Equipment Panel */}
        <div className="w-36 flex-shrink-0">
          <h3 className="text-mono text-xs text-dungeon-100 mb-2 tracking-wider">EQUIPPED</h3>
          <div className="space-y-1.5">
            <EquipmentCard slot="body" item={equipItem('body')} onHover={setHoveredItem} onClick={(i) => setSelectedItem(i)} />
            <EquipmentCard slot="mainHand" item={equipItem('mainHand')} onHover={setHoveredItem} onClick={(i) => setSelectedItem(i)} />
            <EquipmentCard slot="offHand" item={equipItem('offHand')} onHover={setHoveredItem} onClick={(i) => setSelectedItem(i)} />
          </div>
        </div>
      </div>

      {/* Hover Info Panel */}
      {hoveredItem ? (
        <div className="p-2 bg-dungeon-900 pixel-border">
          <div className="text-mono text-xs text-gold">{hoveredItem.name}</div>
          <div className="text-mono text-[10px] text-dungeon-100 mt-0.5">{hoveredItem.description}</div>
        </div>
      ) : (
        <div className="p-2 bg-dungeon-900 pixel-border">
          <div className="text-mono text-[10px] text-dungeon-400 text-center">Hover over an item to see details</div>
        </div>
      )}

      {/* Item Action Popup */}
      {selectedItem && (
        <ItemPopup
          item={selectedItem}
          player={player}
          onEquip={onEquip}
          onUnequip={onUnequip}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

export function CharacterSheet({ player, isOpen, onClose }: CharacterSheetProps) {
  const [tab, setTab] = useState<Tab>('attributes');
  const { emitEquip, emitUnequip } = useSocketContext();

  if (!isOpen || !player) return null;

  const handleEquip = (itemId: string, slot: 'body' | 'mainHand' | 'offHand') => {
    emitEquip(itemId, slot);
  };

  const handleUnequip = (slot: SlotKey) => {
    emitUnequip(slot);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-dungeon-700 w-full max-w-lg mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-0">
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
        <div className="p-4">
          {tab === 'attributes' && <AttributesTab player={player} />}
          {tab === 'inventory' && (
            <InventoryTab
              player={player}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          )}
        </div>
      </div>
    </div>
  );
}
