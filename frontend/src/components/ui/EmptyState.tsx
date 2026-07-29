import { memo, ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export const EmptyState = memo(function EmptyState({
  message,
  icon,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        {icon && <div className="mb-3">{icon}</div>}
        <p className="font-pixel text-xs text-stone-600">{message}</p>
        {children}
      </div>
    </div>
  );
});
