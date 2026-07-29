import { memo } from 'react';

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalTitle = memo(function ModalTitle({
  children,
  className = '',
}: ModalTitleProps) {
  return (
    <div className={`panel-header ${className}`}>
      <h2 className="font-pixel text-sm text-gold-400 tracking-wider text-shadow-glow-gold">
        {children}
      </h2>
    </div>
  );
});
