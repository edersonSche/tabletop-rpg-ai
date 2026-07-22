import { Sword } from "pixelarticons/react";
import { useSocket } from "../../hooks/useSocket";
import logo from "../../assets/logo.png";

export function Header() {
  const { connected, player, gameState } = useSocket();

  return (
    <header className="bg-dungeon-900 border-b-2 border-gold px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {gameState?.campaignName && (
          <div className="flex flex-col ">
            <span className="text-mono text-sm text-gold leading-tight">
              Campaign Name
            </span>
            <span className="text-mono font-semibold text-dungeon-100 leading-tight">
              {gameState.campaignName}
            </span>
          </div>
        )}
        <div className="flex flex-col">
          <img className="max-h-[36px]" src={logo} />
        </div>

        <div className="flex items-center gap-4 text-mono text-sm">
          <span
            className={`flex items-center gap-1 ${connected ? "text-green-400" : "text-blood"}`}
          >
            <span
              className={`w-2 h-2 inline-block ${connected ? "bg-green-400" : "bg-blood"}`}
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </header>
  );
}
