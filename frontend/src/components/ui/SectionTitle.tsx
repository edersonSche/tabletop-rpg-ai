import { memo } from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionTitle = memo(function SectionTitle({
  children,
  className = '',
}: SectionTitleProps) {
  return (
    <div
      className={`font-pixel text-[9px] text-stone-500 mb-2 tracking-wider ${className}`}
    >
      {children}
    </div>
  );
});
