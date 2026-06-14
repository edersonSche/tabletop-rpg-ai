import { Box } from 'pixelarticons/react';

interface DiceRollButtonProps {
  onRoll: () => void;
  disabled: boolean;
  show: boolean;
}

export function DiceRollButton({ onRoll, disabled, show }: DiceRollButtonProps) {
  if (!show) return null;

  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      className="bg-dungeon-600 hover:bg-dungeon-500 text-gold px-4 py-3 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <Box width={20} height={20} />
      <span className="hidden sm:inline">ROLL</span>
    </button>
  );
}
