import { Box } from "pixelarticons/react";
import { Modal, ModalTitle, Button } from "../ui";
import { NarrationMarkdown } from "../shared/NarrationMarkdown";

interface RollRequestModalProps {
  narration: string;
  skill?: string;
  dc?: number;
  onRoll: () => void;
}

export function RollRequestModal({
  narration,
  skill,
  dc,
  onRoll,
}: RollRequestModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={() => {}}
      maxWidth="2xl"
      showCloseButton={false}
    >
      <div className="p-5">
        <ModalTitle className="mb-1">SKILL CHECK</ModalTitle>
        <p className="font-pixel text-xs text-stone-600 mb-4">
          The Game Master demands a roll from you.
        </p>

        {narration && (
          <div className="bg-zinc-900/60 pixel-border p-4 mb-4">
            <div className="font-pixel text-sm text-stone-300 leading-relaxed">
              <NarrationMarkdown content={narration} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="font-pixel text-xs text-gold-500 tracking-widest">
            {(skill || "DEXTERITY").toUpperCase()}
          </div>
          <div className="font-pixel text-xs text-stone-400">
            DIFFICULTY <span className="text-cyan-400">DC {dc ?? 10}</span>
          </div>
        </div>

        <Button
          onClick={onRoll}
          variant="cyan"
          fullWidth
          className="h-11"
        >
          <Box width={18} height={18} />
          <span>ROLL THE DICE</span>
        </Button>
      </div>
    </Modal>
  );
}
