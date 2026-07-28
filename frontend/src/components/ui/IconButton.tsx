import { memo, ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: 'bronze' | 'panel' | 'blood' | 'danger';
  className?: string;
}

const variantClasses: Record<string, string> = {
  bronze:
    'bg-bronze-500 text-panel-950 hover:bg-bronze-400',
  panel:
    'bg-panel-800 text-stone-500 hover:text-stone-300',
  blood:
    'bg-blood-700 text-stone-300 hover:bg-blood-600',
  danger:
    'bg-panel-800 text-stone-500 hover:text-blood-500',
};

export const IconButton = memo(function IconButton({
  icon,
  onClick,
  disabled,
  title,
  variant = 'bronze',
  className = '',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center pixel-border transition-all disabled:opacity-40 ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </button>
  );
});
