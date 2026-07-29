import { memo } from 'react';

interface ErrorTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ErrorText = memo(function ErrorText({
  children,
  className = '',
}: ErrorTextProps) {
  return (
    <p className={`font-pixel text-xs text-blood-500 text-center mb-4 ${className}`}>
      {children}
    </p>
  );
});
