import { memo, ReactNode } from 'react';

interface TextButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  icon?: ReactNode;
  color?: 'blood' | 'gold' | 'stone';
  className?: string;
}

const colorClasses: Record<string, string> = {
  blood: 'text-blood-600 hover:text-blood-500',
  gold: 'text-gold-600 hover:text-gold-500',
  stone: 'text-stone-500 hover:text-stone-300',
};

export const TextButton = memo(function TextButton({
  onClick,
  disabled,
  children,
  icon,
  color = 'blood',
  className = '',
}: TextButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-pixel text-[10px] transition-colors flex items-center gap-1 disabled:opacity-40 ${colorClasses[color]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
});
