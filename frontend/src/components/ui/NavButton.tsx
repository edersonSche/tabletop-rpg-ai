import { memo, ReactNode } from 'react';

interface NavButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: 'gold' | 'danger' | 'default';
  className?: string;
}

const accentClasses: Record<string, string> = {
  danger: 'text-blood-600 hover:text-blood-500 hover:bg-blood-700/20',
  gold: 'text-gold-500 hover:text-gold-400 hover:bg-bronze-500/10',
  default: 'text-stone-400 hover:text-gold-400 hover:bg-panel-800',
};

export const NavButton = memo(function NavButton({
  icon,
  label,
  onClick,
  disabled,
  accent = 'default',
  className = '',
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-2 font-pixel text-[10px] tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${accentClasses[accent]} ${className}`}
    >
      {icon}
      {label}
    </button>
  );
});
