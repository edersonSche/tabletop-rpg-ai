import { memo } from 'react';

interface DividerProps {
  variant?: 'gold' | 'stone';
  className?: string;
}

export const Divider = memo(function Divider({
  variant = 'gold',
  className = '',
}: DividerProps) {
  return (
    <div
      className={`${variant === 'gold' ? 'divider-gold' : 'divider-stone'} ${className}`}
    />
  );
});
