import { memo } from 'react';

interface StatusDotProps {
  status: 'online' | 'offline' | 'error';
  className?: string;
}

const statusClasses: Record<string, string> = {
  online: 'bg-cyan-400 animate-crystal-pulse',
  offline: 'bg-blood-600',
  error: 'bg-blood-500 animate-crystal-pulse',
};

export const StatusDot = memo(function StatusDot({
  status,
  className = '',
}: StatusDotProps) {
  return (
    <div className={`w-2 h-2 ${statusClasses[status]} ${className}`} />
  );
});
