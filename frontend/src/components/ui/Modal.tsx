import { memo } from 'react';
import { Close } from 'pixelarticons/react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: 'xs' | 'sm' | 'xl' | '3xl';
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  maxHeight?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
};

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  maxWidth = 'sm',
  children,
  className = '',
  showCloseButton = true,
  maxHeight = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className={`pixel-border-ornate bg-panel-950 w-full ${maxWidthClasses[maxWidth]} mx-4 relative ${maxHeight ? 'max-h-[85vh] flex flex-col' : ''} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-stone-600 hover:text-stone-300 transition-colors z-10"
          >
            <Close width={16} height={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
});
