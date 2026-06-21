import { useState } from 'react';
import { Sword } from 'pixelarticons/react';
import { CreateRoom } from '../components/Lobby/CreateRoom';
import { RoomList } from '../components/Lobby/RoomList';
import { useSocket } from '../hooks/useSocket';
import type { NarrativeLanguage } from '../types/game.types';

export function Lobby() {
  const { createRoom, joinRoom, error } = useSocket();
  const [mode, setMode] = useState<'create' | 'join'>('join');

  const handleCreate = (name: string, language: NarrativeLanguage) => {
    createRoom(name, language);
  };

  const handleJoin = (roomId: string) => {
    joinRoom(roomId);
  };

  return (
    <div className="min-h-screen bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-pixel text-2xl text-gold mb-2 flex items-center justify-center gap-2">
            <Sword width={24} height={24} />
            <span>RPG TABLETOP</span>
            <Sword width={24} height={24} />
          </h1>
          <p className="text-mono text-dungeon-300 text-lg">AI Game Master · Endless adventures</p>
        </div>

        {error && (
          <div className="text-mono text-sm text-blood bg-blood/10 border border-blood/30 p-3 pixel-border text-center mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => setMode('create')}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === 'create'
                ? 'bg-gold text-dungeon-900'
                : 'bg-dungeon-600 text-dungeon-200 hover:text-gold'
            }`}
          >
            [CREATE CAMPAIGN]
          </button>
          <button
            onClick={() => setMode('join')}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === 'join'
                ? 'bg-gold text-dungeon-900'
                : 'bg-dungeon-600 text-dungeon-200 hover:text-gold'
            }`}
          >
            [JOIN CAMPAIGN]
          </button>
        </div>

        {mode === 'create' ? (
          <CreateRoom onCreate={handleCreate} />
        ) : (
          <RoomList onJoin={handleJoin} />
        )}
      </div>
    </div>
  );
}
