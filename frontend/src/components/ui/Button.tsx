import { memo } from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-bronze-500 text-stone-200 font-bold hover:bg-bronze-400 hover:shadow-glow-gold border border-[rgba(168,116,72,0.4)] shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.25),inset_2px_2px_0_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]',
  secondary:
    'bg-panel-800 text-stone-300 pixel-border hover:bg-panel-700 hover:text-gold-400',
  danger:
    'bg-blood-700 text-stone-300 pixel-border hover:bg-blood-600 hover:text-stone-300',
  gold:
    'bg-gold-500 text-navy-900 font-bold hover:bg-gold-400 hover:shadow-glow-gold shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.2),inset_2px_2px_0_0_rgba(255,255,255,0.15)]',
  cyan:
    'bg-cyan-400 text-navy-900 font-bold hover:bg-cyan-300 hover:shadow-glow-cyan shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.2),inset_2px_2px_0_0_rgba(255,255,255,0.15)]',
};

const sizeClasses: Record<string, string> = {
  xs: 'py-1 px-2 text-xs',
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2.5 px-5 text-xs',
  lg: 'py-3 px-4 text-xs',
};

export const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  disabled,
  children,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-pixel tracking-wider transition-all uppercase active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
});
