import { useState } from 'react';
import { Close, Copy } from 'pixelarticons/react';

interface OptionsModalProps {
  roomId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OptionsModal({ roomId, isOpen, onClose }: OptionsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="pixel-border-ornate bg-panel-950 w-full max-w-sm mx-4 p-5 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-stone-600 hover:text-stone-300 transition-colors">
          <Close width={16} height={16} />
        </button>

        <div className="panel-header">
          <h2 className="font-pixel text-[13px] text-gold-400 tracking-wider text-shadow-glow-gold">OPTIONS</h2>
        </div>

        <div className="font-pixel text-[9px] text-stone-500 mb-2 tracking-wider">ROOM CODE</div>
        <div className="flex items-center justify-between bg-zinc-900 pixel-border p-3">
          <span className="font-pixel text-[12px] text-gold-400 tracking-widest">{roomId || '---'}</span>
          <button
            onClick={handleCopy}
            className="text-stone-500 hover:text-gold-400 transition-colors"
            title="Copy room code"
          >
            <Copy width={14} height={14} />
          </button>
        </div>

        {copied && (
          <p className="font-pixel text-[9px] text-forest-600 mt-2">COPIED TO SCROLL</p>
        )}
      </div>
    </div>
  );
}
