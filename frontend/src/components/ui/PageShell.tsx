import { memo } from 'react';

interface PageShellProps {
  maxWidth?: 'sm' | 'md' | 'lg' | '2xl';
  center?: boolean;
  children: React.ReactNode;
  className?: string;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  '2xl': 'max-w-2xl',
};

export const PageShell = memo(function PageShell({
  maxWidth = 'lg',
  center = true,
  children,
  className = '',
}: PageShellProps) {
  return (
    <div
      className={`min-h-screen ${center ? 'flex items-center justify-center' : ''} p-4 relative bg-panel-950 ${className}`}
    >
      <div className={`w-full ${maxWidthClasses[maxWidth]} space-y-6 relative z-10`}>
        {children}
      </div>
    </div>
  );
});
