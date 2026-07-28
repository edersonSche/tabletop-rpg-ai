import { useState } from 'react';
import { Copy } from 'pixelarticons/react';
import { Modal, ModalTitle, SectionTitle } from '../ui';

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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" className="p-5">
      <ModalTitle>OPTIONS</ModalTitle>

      <SectionTitle>ROOM CODE</SectionTitle>
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
    </Modal>
  );
}
