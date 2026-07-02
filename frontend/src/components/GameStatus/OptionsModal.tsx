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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80" onClick={onClose}>
      <div className="pixel-border bg-dungeon-700 w-full max-w-sm mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-dungeon-100 hover:text-dungeon-100 transition-colors"
        >
          <Close width={18} height={18} />
        </button>

        <h2 className="text-pixel text-xs text-gold mb-4 tracking-wider">OPTIONS</h2>

        <div className="flex items-center justify-between bg-dungeon-800 pixel-border p-3">
          <span className="text-mono text-sm text-gold">{roomId || '---'}</span>
          <button
            onClick={handleCopy}
            className="text-dungeon-100 hover:text-gold transition-colors"
            title="Copy room code"
          >
            <Copy width={16} height={16} />
          </button>
        </div>

        {copied && (
          <p className="text-mono text-xs text-green-400 mt-2">Copied!</p>
        )}
      </div>
    </div>
  );
}
