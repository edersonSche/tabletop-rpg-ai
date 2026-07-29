import { memo } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'you' | 'host' | 'suggested' | 'quantity' | 'default';
  className?: string;
}

const variantClasses: Record<string, string> = {
  you: 'font-pixel text-xs text-cyan-400',
  host: 'font-pixel text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5',
  suggested: 'font-pixel text-xs text-gold-400 bg-gold-500/10 px-2 py-0.5 border border-gold-500/20',
  quantity: 'font-pixel text-xs text-stone-600',
  default: 'font-pixel text-xs bg-zinc-900 text-stone-400 px-1.5 py-0.5 pixel-border-light',
};

export const Badge = memo(function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
});
