import { useState } from "react";
import {
  Sword,
  Shield,
  Wallet,
  Human,
  Circle,
  Box,
  Heart,
  Sparkles,
} from "pixelarticons/react";
import {
  Player,
  InventoryItem,
  ActiveCondition,
  Effect,
} from "../../types/game.types";
import { useInventory } from "../../hooks/useInventory";
import {
  CONDITION_ICONS,
  ITEM_TYPE_ICONS,
  ATTRIBUTE_ICONS,
  ATTRIB_KEYS,
} from "../shared/constants";
import { HoverPopup } from "../shared/HoverPopup";
import { ConfirmUseModal } from "../shared/ConfirmUseModal";
import {
  Modal,
  ModalTitle,
  SectionTitle,
  StatRow,
  Button,
  EmptyState,
  EquipmentSlot,
} from "../ui";

interface CharacterSheetProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
}

type SlotKey = "body" | "mainHand" | "offHand";

const SLOT_ICONS: Record<
  SlotKey,
  React.ComponentType<{ width?: number; height?: number; className?: string }>
> = {
  body: Human,
  mainHand: Sword,
  offHand: Shield,
};

const SLOT_LABELS: Record<SlotKey, string> = {
  body: "Body",
  mainHand: "Main Hand",
  offHand: "Off Hand",
};

function ConditionIcon({
  condition,
  className,
}: {
  condition: string;
  className?: string;
}) {
  const Icon = CONDITION_ICONS[condition] || Circle;
  return (
    <Icon width={12} height={12} className={className || "text-stone-500"} />
  );
}

export function EffectRow({
  effect,
  remainingDuration,
}: {
  effect: Effect;
  remainingDuration?: number;
}) {
  let text = "";
  if (effect.hpChange) {
    const prefix = effect.hpChange.type === "damage" ? "-" : "+";
    text = `${prefix}${effect.hpChange.formula} HP/turn`;
  }
  if (effect.statModifiers) {
    const modTexts = effect.statModifiers.map(
      (m) =>
        `${m.operation === "override" ? "Override: " : ""}${m.value > 0 ? "+" : ""}${m.value} ${m.target.toUpperCase()}${m.dexCap !== undefined ? ` (DEX max ${m.dexCap})` : ""}`,
    );
    text = modTexts.join(", ");
  }
  if (!text) return null;

  return (
    <div className="flex justify-between font-pixel text-xs text-stone-500 ml-2 mt-0.5">
      <span>{text}</span>
      {remainingDuration !== undefined && remainingDuration > 0 && (
        <span className="text-stone-600">{remainingDuration}t</span>
      )}
    </div>
  );
}

function hasAntidoteInInventory(
  player: Player,
  conditionName: string,
): boolean {
  return player.inventory.some((i) => i.antidoteFor === conditionName);
}

function formatDuration(remainingDurations: number[]): string {
  const active = remainingDurations.filter((d) => d > 0);
  if (active.length === 0) return "";
  return `${Math.min(...active)}t`;
}

function ActiveConditionsSection({
  player,
  onUseAntidote,
  disabled = false,
}: {
  player: Player;
  onUseAntidote: (conditionName: string) => void;
  disabled?: boolean;
}) {
  const conditions =
    player.activeConditions?.filter((ac) => !ac.isSuppressed) || [];
  if (conditions.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="font-pixel text-xs text-stone-500 mb-2 tracking-wider">
        ACTIVE CONDITIONS
      </div>
      <div className="space-y-2">
        {conditions.map((ac) => (
          <div
            key={ac.id}
            className="p-2 bg-zinc-900 pixel-border border-l-2 border-blood-600"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ConditionIcon condition={ac.condition.name} />
                <span className="font-pixel text-xs text-blood-500">
                  {ac.condition.name}
                </span>
              </div>
              <span className="font-pixel text-xs text-stone-600">
                {formatDuration(ac.remainingDurations)}
              </span>
            </div>
            <div className="font-pixel text-xs text-stone-400 mt-1">
              {ac.condition.description}
            </div>
            {ac.condition.effects.map((ef, i) => (
              <EffectRow
                key={i}
                effect={ef}
                remainingDuration={ac.remainingDurations[i]}
              />
            ))}
            {hasAntidoteInInventory(player, ac.condition.name) && (
              <button
                onClick={() => onUseAntidote(ac.condition.name)}
                disabled={disabled}
                className="mt-2 w-full bg-forest-800/50 border border-forest-600/30 pixel-border py-1 font-pixel text-xs text-forest-600 hover:bg-forest-700/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-forest-800/50"
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

function ItemCell({
  item,
  isEquipped,
}: {
  item: InventoryItem;
  isEquipped?: boolean;
}) {
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 px-2 py-1.5 flex items-center gap-2 hover:bg-panel-800 transition-all ${isEquipped ? "border-l-2 border-gold-400" : ""}`}
    >
      <div className="flex items-center justify-center flex-shrink-0">
        <TypeIcon
          width={12}
          height={12}
          className={isEquipped ? "text-gold-400" : "text-stone-500"}
        />
      </div>
      <div
        className={`font-pixel text-xs flex-1 min-w-0 truncate ${isEquipped ? "text-gold-400" : "text-stone-300"}`}
      >
        {item.name}
      </div>
      {item.quantity > 1 && (
        <div className="font-pixel text-xs text-stone-600 flex-shrink-0">
          x{item.quantity}
        </div>
      )}
      {isEquipped && <div className="w-1.5 h-1.5 bg-gold-400 flex-shrink-0" />}
    </div>
  );
}

function EquipmentCard({
  slot,
  item,
}: {
  slot: SlotKey;
  item: InventoryItem | undefined;
}) {
  const Icon = SLOT_ICONS[slot];

  if (!item) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-2 opacity-40">
        <div className="flex items-center gap-2">
          <Icon width={14} height={14} className="text-stone-700" />
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-xs text-stone-600">Empty</div>
            <div className="font-pixel text-xs text-stone-700 uppercase">
              {SLOT_LABELS[slot]}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-2 group hover:bg-panel-800 transition-all">
      <div className="flex items-center gap-2">
        <Icon width={14} height={14} className="text-gold-400" />
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-xs text-stone-300 truncate">
            {item.name}
          </div>
          <div className="font-pixel text-xs text-stone-600 uppercase">
            {SLOT_LABELS[slot]}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemPopupContent({
  item,
  player,
  onEquip,
  onUnequip,
  onUseItem,
  onClose,
  disabled = false,
}: {
  item: InventoryItem;
  player: Player;
  onEquip: (itemId: string, slot: "body" | "mainHand" | "offHand") => void;
  onUnequip: (slot: SlotKey) => void;
  onUseItem: (itemId: string) => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const [confirmUse, setConfirmUse] = useState(false);
  const TypeIcon = ITEM_TYPE_ICONS[item.type] || Box;
  const isEquipped =
    player.equipment.body === item.id ||
    player.equipment.mainHand === item.id ||
    player.equipment.offHand === item.id;
  const equippedSlot: SlotKey | null = isEquipped
    ? player.equipment.body === item.id
      ? "body"
      : player.equipment.mainHand === item.id
        ? "mainHand"
        : "offHand"
    : null;

  return (
    <>
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-zinc-900 pixel-border flex items-center justify-center">
            <TypeIcon width={18} height={18} className="text-gold-400" />
          </div>
          <div>
            <div className="font-pixel text-xs text-gold-400">{item.name}</div>
            {item.quantity > 1 && (
              <div className="font-pixel text-xs text-stone-600">
                x{item.quantity}
              </div>
            )}
          </div>
        </div>

        <div className="font-pixel text-xs text-stone-400 mb-3">
          {item.description}
        </div>

        {item.effects && item.effects.length > 0 && (
          <div className="mb-3 p-2 bg-zinc-900 pixel-border">
            <div className="font-pixel text-xs text-stone-500 mb-1 tracking-wider">
              EFFECTS
            </div>
            {item.effects.map((ef, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex justify-between items-center">
                  <span className="font-pixel text-xs text-stone-600">
                    {ef.type === "immediate"
                      ? "Instant"
                      : ef.type === "temporary"
                        ? "Temporary"
                        : "Permanent"}
                    {ef.duration ? ` (${ef.duration}t)` : ""}
                  </span>
                  <span className="font-pixel text-xs text-stone-600">
                    {ef.origin}
                  </span>
                </div>
                <EffectRow effect={ef} />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          {item.effects && item.effects.some((e) => e.type === "immediate") && (
            <Button size="xs" fullWidth onClick={() => setConfirmUse(true)} disabled={disabled}>
              USE
            </Button>
          )}

          {isEquipped ? (
            <Button
              size="xs"
              fullWidth
              onClick={() => {
                onUnequip(equippedSlot!);
                onClose();
              }}
              disabled={disabled}
            >
              UNEQUIP ({SLOT_LABELS[equippedSlot!]})
            </Button>
          ) : (
            <>
              {item.slot === "body" && (
                <Button
                  size="xs"
                  fullWidth
                  onClick={() => {
                    onEquip(item.id, "body");
                    onClose();
                  }}
                  disabled={disabled}
                >
                  EQUIP (BODY)
                </Button>
              )}
              {item.slot === "two-handed" && (
                <Button
                  size="xs"
                  fullWidth
                  onClick={() => {
                    onEquip(item.id, "mainHand");
                    onClose();
                  }}
                  disabled={disabled}
                >
                  EQUIP (2-HANDED)
                </Button>
              )}
              {item.slot === "hand" && (
                <>
                  <Button
                    size="xs"
                    fullWidth
                    onClick={() => {
                      onEquip(item.id, "mainHand");
                      onClose();
                    }}
                    disabled={disabled}
                  >
                    EQUIP (MAIN HAND)
                  </Button>
                  <Button
                    size="xs"
                    fullWidth
                    onClick={() => {
                      onEquip(item.id, "offHand");
                      onClose();
                    }}
                    disabled={disabled}
                  >
                    EQUIP (OFF HAND)
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {confirmUse && (
        <ConfirmUseModal
          item={item}
          onUse={() => {
            onUseItem(item.id);
            onClose();
          }}
          onClose={() => setConfirmUse(false)}
        />
      )}
    </>
  );
}

export function CharacterSheet({
  player,
  isOpen,
  onClose,
  disabled = false,
}: CharacterSheetProps) {
  const { emitEquip, emitUnequip, emitUseItem, emitUseAntidote } =
    useInventory();

  if (!isOpen || !player) return null;

  const handleEquip = (itemId: string, slot: "body" | "mainHand" | "offHand") =>
    emitEquip(itemId, slot);
  const handleUnequip = (slot: SlotKey) => emitUnequip(slot);
  const handleUseItem = (itemId: string) => emitUseItem(itemId);
  const handleUseAntidote = (conditionName: string) => {
    const item = player.inventory.find((i) => i.antidoteFor === conditionName);
    if (item) emitUseAntidote(item.id, conditionName);
  };

  const equipItem = (slot: SlotKey): InventoryItem | undefined => {
    const id = player.equipment[slot];
    return id ? player.inventory.find((i) => i.id === id) : undefined;
  };

  const bodyItem = equipItem("body");
  const mainHandItem = equipItem("mainHand");
  const offHandItem = equipItem("offHand");
  const equippedIds = new Set(
    Object.values(player.equipment).filter(Boolean) as string[],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" maxHeight>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-zinc-800">
        <ModalTitle className="mb-3">CHARACTER SHEET</ModalTitle>

        <div className="flex gap-3 items-end">
          <div className="flex-1 font-pixel flex flex-col bg-zinc-900 border border-zinc-800 px-1 py-1 text-xs">
            <div className="flex gap-1.5">
              <span className="font-semibold text-stone-500">Name:</span>
              <span>{player.name}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-semibold text-stone-500">Level:</span>
              <span>{player.level}</span>
            </div>
          </div>

          <div className="min-w-28">
            <StatRow
              icon={Heart}
              iconColor="text-blood-500"
              label="HP"
              value={player.hp}
              barColor="bg-gradient-to-r from-blood-800 to-blood-500"
              max={player.maxHp}
            />
          </div>

          <div className="min-w-28">
            <StatRow
              icon={Sparkles}
              iconColor="text-emerald-500"
              label="XP"
              value={player.xp}
              barColor="bg-gradient-to-r from-emerald-800 to-emerald-400"
              max={player.maxXp}
            />
          </div>
        </div>
      </div>

      {/* Body: 3 columns */}
      <div className="flex-1 overflow-y-auto scrollbar-quest p-4">
        <div className="flex flex-col md:flex-row gap-4 min-h-0">
          {/* Left Column: AC + Attributes + Conditions */}
          <div className="min-w-32 space-y-1">
            <SectionTitle>ATTRIBUTES</SectionTitle>
            <StatRow
              icon={Shield}
              iconColor="text-cyan-400"
              label="AC"
              value={player.ac}
              barColor="bg-gradient-to-r from-cyan-700 to-cyan-400"
              max={30}
            />
            {ATTRIB_KEYS.map((key) => {
              const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
              return (
                <StatRow
                  key={key}
                  icon={Icon}
                  iconColor="text-gold-400"
                  label={label}
                  value={player.attributes[key]}
                />
              );
            })}

            <ActiveConditionsSection
              player={player}
              onUseAntidote={handleUseAntidote}
              disabled={disabled}
            />
          </div>

          {/* Center Column: Equipment */}
          <div className="min-w-48 flex-shrink-0">
            <SectionTitle>EQUIPMENT</SectionTitle>
            <div className="space-y-1.5">
              {!bodyItem ? (
                <EquipmentSlot slot="body" item={bodyItem} />
              ) : (
                <HoverPopup
                  content={(close) => (
                    <ItemPopupContent
                      item={bodyItem}
                      player={player}
                      onEquip={handleEquip}
                      onUnequip={handleUnequip}
                      onUseItem={handleUseItem}
                      onClose={close}
                      disabled={disabled}
                    />
                  )}
                >
                  <EquipmentSlot slot="body" item={bodyItem} />
                </HoverPopup>
              )}
              {!mainHandItem ? (
                <EquipmentSlot slot="mainHand" item={mainHandItem} />
              ) : (
                <HoverPopup
                  content={(close) => (
                    <ItemPopupContent
                      item={mainHandItem}
                      player={player}
                      onEquip={handleEquip}
                      onUnequip={handleUnequip}
                      onUseItem={handleUseItem}
                      onClose={close}
                      disabled={disabled}
                    />
                  )}
                >
                  <EquipmentSlot slot="mainHand" item={mainHandItem} />
                </HoverPopup>
              )}
              {!offHandItem ? (
                <EquipmentSlot slot="offHand" item={offHandItem} />
              ) : (
                <HoverPopup
                  content={(close) => (
                    <ItemPopupContent
                      item={offHandItem}
                      player={player}
                      onEquip={handleEquip}
                      onUnequip={handleUnequip}
                      onUseItem={handleUseItem}
                      onClose={close}
                      disabled={disabled}
                    />
                  )}
                >
                  <EquipmentSlot slot="offHand" item={offHandItem} />
                </HoverPopup>
              )}
            </div>
          </div>

          {/* Right Column: Inventory */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <SectionTitle className="mb-0">INVENTORY</SectionTitle>
              <div className="flex items-center gap-1.5">
                <Wallet width={12} height={12} className="text-gold-400" />
                <span className="font-pixel text-xs text-gold-400">
                  {player.coins}g
                </span>
              </div>
            </div>
            {player.inventory.length === 0 ? (
              <EmptyState message="YOUR POUCH IS EMPTY" />
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1 scrollbar-quest">
                {player.inventory.map((item) => (
                  <HoverPopup
                    key={item.id}
                    content={(close) => (
                      <ItemPopupContent
                        item={item}
                        player={player}
                        onEquip={handleEquip}
                        onUnequip={handleUnequip}
                        onUseItem={handleUseItem}
                        onClose={close}
                        disabled={disabled}
                      />
                    )}
                  >
                    <ItemCell
                      item={item}
                      isEquipped={equippedIds.has(item.id)}
                    />
                  </HoverPopup>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
