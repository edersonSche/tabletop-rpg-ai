import { memo } from 'react';

interface PanelTitleProps {
  size?: 'sm' | 'md';
  center?: boolean;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'text-[12px]',
  md: 'text-[13px]',
};

export const PanelTitle = memo(function PanelTitle({
  size = 'md',
  center,
  children,
  className = '',
}: PanelTitleProps) {
  return (
    <h2
      className={`font-pixel ${sizeClasses[size]} text-gold-400 text-shadow-glow-gold ${center ? 'text-center' : ''} ${className}`}
    >
      {children}
    </h2>
  );
});
