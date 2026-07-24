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
      className="h-11 px-4 flex items-center gap-2 bg-cyan-400 text-navy-900 font-pixel text-[9px] pixel-border hover:bg-cyan-300 hover:shadow-glow-cyan transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
    >
      <Box width={16} height={16} />
      <span className="hidden sm:inline">ROLL</span>
    </button>
  );
}
