import { memo, ReactNode } from 'react';
import { Box } from 'pixelarticons/react';
import { ITEM_TYPE_ICONS } from '../shared/constants';

interface ItemRowProps {
  iconType?: string;
  customIcon?: ReactNode;
  name: string;
  detail?: string;
  isEquipped?: boolean;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const ItemRow = memo(function ItemRow({
  iconType,
  customIcon,
  name,
  detail,
  isEquipped,
  action,
  className = '',
  children,
}: ItemRowProps) {
  const Icon = iconType ? (ITEM_TYPE_ICONS[iconType] || Box) : null;

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 px-2 py-1.5 flex items-center gap-2 hover:bg-panel-800 transition-all ${isEquipped ? 'border-l-2 border-gold-400' : ''} ${className}`}
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {customIcon || (Icon && <Icon width={12} height={12} className={isEquipped ? 'text-gold-400' : 'text-stone-500'} />)}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-pixel text-xs truncate ${isEquipped ? 'text-gold-400' : 'text-stone-300'}`}>
          {name}
        </div>
        {detail && <div className="font-pixel text-xs text-stone-600">{detail}</div>}
        {children}
      </div>
      {action}
    </div>
  );
});
