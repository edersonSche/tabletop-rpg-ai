import { Box } from 'pixelarticons/react';
import { Button } from '../ui';

interface DiceRollButtonProps {
  onRoll: () => void;
  disabled: boolean;
  show: boolean;
}

export function DiceRollButton({ onRoll, disabled, show }: DiceRollButtonProps) {
  if (!show) return null;

  return (
    <Button
      onClick={onRoll}
      disabled={disabled}
      variant="cyan"
      size="sm"
      className="h-11 flex items-center gap-2"
    >
      <Box width={16} height={16} />
      <span className="hidden sm:inline">ROLL</span>
    </Button>
  );
}
