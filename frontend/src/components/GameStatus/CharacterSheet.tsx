import { Close, Sword, Target, Heart, BookOpen, Star, Crown } from 'pixelarticons/react';
import { Player } from '../../types/game.types';

interface CharacterSheetProps {
  player: Player | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const ATTRIBUTE_ICONS: Record<keyof Player['attributes'], { label: string; icon: React.ComponentType<{ width?: number; height?: number; className?: string }> }> = {
  strength:     { label: 'Strength',     icon: Sword },
  dexterity:    { label: 'Dexterity',    icon: Target },
  constitution: { label: 'Constitution', icon: Heart },
  intelligence: { label: 'Intelligence', icon: BookOpen },
  wisdom:       { label: 'Wisdom',       icon: Star },
  charisma:     { label: 'Charisma',     icon: Crown },
};

const ATTRIB_KEYS = Object.keys(ATTRIBUTE_ICONS) as Array<keyof Player['attributes']>;

export function CharacterSheet({ player, isOpen, onClose }: CharacterSheetProps) {
  if (!isOpen || !player) return null;

  const attributes = player.attributes;
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const xpPct = player.maxXp > 0 ? Math.round((player.xp / player.maxXp) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-dungeon-700 w-full max-w-sm mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-dungeon-300 hover:text-dungeon-100 transition-colors"
        >
          <Close width={18} height={18} />
        </button>

        <h2 className="text-mono text-lg text-gold text-center mb-6">{player.name}</h2>

        {/* HP Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-mono text-xs text-dungeon-300">HP</span>
            <span className="text-mono text-xs text-dungeon-300">{player.hp}/{player.maxHp}</span>
          </div>
          <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
            <div
              className="h-full bg-blood rounded-full transition-all"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-mono text-xs text-dungeon-300">XP</span>
            <span className="text-mono text-xs text-dungeon-300">{player.xp}/{player.maxXp}</span>
          </div>
          <div className="h-3 bg-dungeon-900 rounded-full overflow-hidden pixel-border">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        <h3 className="text-mono text-xs text-dungeon-300 mb-3 tracking-wider">ATRIBUTES</h3>

        <div className="grid grid-cols-3 gap-2">
          {ATTRIB_KEYS.map((key) => {
            const { label, icon: Icon } = ATTRIBUTE_ICONS[key];
            return (
              <div key={key} className="bg-dungeon-600 p-2 pixel-border text-center">
                <div className="flex items-center justify-center gap-1">
                  <Icon width={14} height={14} className="text-gold" />
                  <span className="text-mono text-sm text-gold font-bold">{attributes[key]}</span>
                </div>
                <div className="text-mono text-[10px] text-dungeon-100 mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
