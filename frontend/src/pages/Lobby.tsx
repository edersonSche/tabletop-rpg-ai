import { useState } from "react";
import { CreateRoom } from "../components/Lobby/CreateRoom";
import { RoomList } from "../components/Lobby/RoomList";
import { SavedCampaigns } from "../components/Lobby/SavedCampaigns";
import { useSocket } from "../hooks/useSocket";
import type { NarrativeLanguage } from "../types/game.types";
import logo from "../assets/logo.png";

export function Lobby() {
  const { createRoom, joinRoom, resumeCampaign } = useSocket();
  const [mode, setMode] = useState<"create" | "join" | "resume">("join");

  const handleCreate = async (
    name: string,
    language: NarrativeLanguage,
    campaignTheme?: string,
  ) => {
    await createRoom(name, language, campaignTheme);
  };

  const handleJoin = async (roomId: string) => {
    await joinRoom(roomId);
  };

  const handleResume = async (campaignId: string) => {
    await resumeCampaign(campaignId);
  };

  return (
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center">
          <img className="max-w-[350px]" src={logo} />
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setMode("create")}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === "create"
                ? "bg-gold text-dungeon-900"
                : "bg-dungeon-600 text-dungeon-100 hover:text-gold"
            }`}
          >
            [CREATE]
          </button>
          <button
            onClick={() => setMode("join")}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === "join"
                ? "bg-gold text-dungeon-900"
                : "bg-dungeon-600 text-dungeon-100 hover:text-gold"
            }`}
          >
            [JOIN]
          </button>
          <button
            onClick={() => setMode("resume")}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === "resume"
                ? "bg-gold text-dungeon-900"
                : "bg-dungeon-600 text-dungeon-100 hover:text-gold"
            }`}
          >
            [RESUME]
          </button>
        </div>

        {mode === "create" ? (
          <CreateRoom onCreate={handleCreate} />
        ) : mode === "resume" ? (
          <SavedCampaigns onResume={handleResume} />
        ) : (
          <RoomList onJoin={handleJoin} />
        )}
      </div>
    </div>
  );
}
