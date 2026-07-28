import { useState } from "react";
import { CreateRoom } from "../components/Lobby/CreateRoom";
import { RoomList } from "../components/Lobby/RoomList";
import { SavedCampaigns } from "../components/Lobby/SavedCampaigns";
import { usePlayer } from "../hooks/usePlayer";
import type { NarrativeLanguage } from "../types/game.types";
import logo from "../assets/logo.png";

export function Lobby() {
  const { createRoom, joinRoom, resumeCampaign } = usePlayer();
  const [mode, setMode] = useState<"create" | "join" | "resume">("join");

  const handleCreate = async (name: string, language: NarrativeLanguage) => {
    await createRoom(name, language);
  };

  const handleJoin = async (roomId: string) => {
    await joinRoom(roomId);
  };

  const handleResume = async (campaignId: string) => {
    await resumeCampaign(campaignId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-panel-950">
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        <div className="flex flex-col items-center">
          <img className="max-w-[300px]" src={logo} alt="Tabletop RPG AI" />
        </div>

        <div className="flex gap-2 justify-center">
          <TabButton
            active={mode === "create"}
            onClick={() => setMode("create")}
          >
            CREATE
          </TabButton>
          <TabButton active={mode === "join"} onClick={() => setMode("join")}>
            JOIN
          </TabButton>
          <TabButton
            active={mode === "resume"}
            onClick={() => setMode("resume")}
          >
            RESUME
          </TabButton>
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-pixel text-[12px] px-5 py-2.5 tracking-wider transition-all ${
        active
          ? "bg-bronze-500 text-stone-200 shadow-glow-gold font-bold underline"
          : "bg-panel-800 text-stone-500 pixel-border hover:text-gold-400 hover:bg-panel-700"
      }`}
    >
      {children}
    </button>
  );
}
