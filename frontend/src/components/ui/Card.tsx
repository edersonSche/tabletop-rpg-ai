import { memo } from 'react';

interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  center?: boolean;
  children: React.ReactNode;
  className?: string;
}

const paddingClasses: Record<string, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = memo(function Card({
  padding = 'md',
  center,
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={`card-stone ${paddingClasses[padding]} ${center ? 'text-center' : ''} ${className}`}
    >
      {children}
    </div>
  );
});
