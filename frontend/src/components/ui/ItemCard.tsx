import { memo, ReactNode } from 'react';
import { Box } from 'pixelarticons/react';
import type { Effect } from '../../types/game.types';
import { EffectRow } from '../GameStatus/CharacterSheet';
import { ITEM_TYPE_ICONS } from '../shared/constants';

interface ItemCardProps {
  iconType?: string;
  customIcon?: ReactNode;
  name: string;
  description: string;
  quantity?: number;
  effects?: Effect[];
  antidoteFor?: string;
  children?: ReactNode;
  priceInfo?: string;
  priceColor?: 'gold' | 'blood';
}

export const ItemCard = memo(function ItemCard({
  iconType,
  customIcon,
  name,
  description,
  quantity,
  effects,
  antidoteFor,
  children,
  priceInfo,
  priceColor = 'gold',
}: ItemCardProps) {
  const Icon = iconType ? (ITEM_TYPE_ICONS[iconType] || Box) : null;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-zinc-900 pixel-border flex items-center justify-center flex-shrink-0">
          {customIcon || (Icon && <Icon width={18} height={18} className="text-gold-400" />)}
        </div>
        <div className="min-w-0">
          <div className="font-pixel text-[10px] text-gold-400 truncate">{name}</div>
          {quantity !== undefined && quantity > 1 && (
            <div className="font-pixel text-[8px] text-stone-600">x{quantity}</div>
          )}
        </div>
      </div>

      <div className="font-pixel text-[9px] text-stone-400 mb-3">{description}</div>

      {antidoteFor && (
        <div className="mb-2 p-1 bg-forest-800/30 border border-forest-600/30 pixel-border">
          <span className="font-pixel text-[8px] text-forest-600">Antidote: {antidoteFor}</span>
        </div>
      )}

      {effects && effects.length > 0 && (
        <div className="mb-3 p-2 bg-zinc-900 pixel-border">
          <div className="font-pixel text-[8px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
          {effects.map((ef, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex justify-between items-center">
                <span className="font-pixel text-[8px] text-stone-600">
                  {ef.type === 'immediate'
                    ? 'Instant'
                    : ef.type === 'temporary'
                      ? 'Temporary'
                      : 'Permanent'}
                  {ef.duration ? ` (${ef.duration}t)` : ''}
                </span>
                <span className="font-pixel text-[8px] text-stone-600">{ef.origin}</span>
              </div>
              <EffectRow effect={ef} />
            </div>
          ))}
        </div>
      )}

      {priceInfo && (
        <div className={`font-pixel text-[9px] text-right ${priceColor === 'gold' ? 'text-gold-500' : 'text-blood-600'}`}>
          {priceInfo}
        </div>
      )}

      {children && <div className="space-y-1 mt-3">{children}</div>}
    </div>
  );
});
