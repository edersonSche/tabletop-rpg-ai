import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HoverPopupProps {
  content: (close: () => void) => ReactNode;
  children: ReactNode;
}

export function HoverPopup({ content, children }: HoverPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;

    const onMouseMove = (e: MouseEvent) => {
      const tr = trigger.getBoundingClientRect();
      const pr = popup.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      const insideTrigger = x >= tr.left && x <= tr.right && y >= tr.top && y <= tr.bottom;
      const insidePopup = x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom;
      if (!insideTrigger && !insidePopup) setIsOpen(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [isOpen]);

  const handleMouseEnter = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      let left = rect.left;
      if (left + 256 > window.innerWidth) left = window.innerWidth - 260;
      if (left < 0) left = 4;
      setPos({ top: rect.bottom, left });
    }
    setIsOpen(true);
  };

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter}>
      {children}
      {isOpen && createPortal(
        <div ref={popupRef} className="fixed z-[60]" style={{ top: pos.top, left: pos.left, width: '256px' }}>
          <div className="pixel-border-ornate bg-panel-900 shadow-lg">
            {content(() => setIsOpen(false))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
