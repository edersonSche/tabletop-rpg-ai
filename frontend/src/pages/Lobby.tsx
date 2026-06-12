import { useState, useEffect } from 'react';
import { Sword } from 'pixelarticons/react';
import { CreateRoom } from '../components/Lobby/CreateRoom';
import { RoomList } from '../components/Lobby/RoomList';
import { ThemeToggle } from '../components/Layout/ThemeToggle';
import { useSocket } from '../hooks/useSocket';

export function Lobby() {
  const { socket, createRoom, joinRoom, listRooms, player, error } = useSocket();
  const [rooms, setRooms] = useState<any[]>([]);
  const [mode, setMode] = useState<'create' | 'join'>('join');

  const refreshRooms = async () => {
    const result = await listRooms();
    setRooms(result || []);
  };

  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (updatedRooms: any[]) => setRooms(updatedRooms);
    socket.on('lobby:update', handler);
    return () => { socket.off('lobby:update', handler); };
  }, [socket]);

  const handleCreate = (name: string, playerName: string, language: string) => {
    createRoom(name, playerName, language);
  };

  const handleJoin = (roomId: string, playerName: string) => {
    joinRoom(roomId, playerName);
  };

  return (
    <div className="min-h-screen bg-parchment-200 dark:bg-dungeon-800 bg-noise flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-pixel text-2xl text-gold mb-2 flex items-center justify-center gap-2">
            <Sword width={24} height={24} />
            <span>RPG TABLETOP</span>
            <Sword width={24} height={24} />
          </h1>
          <p className="text-mono text-parchment-500 dark:text-dungeon-300 text-lg">AI Game Master · Endless adventures</p>
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
                : 'bg-parchment-300 dark:bg-dungeon-600 text-parchment-700 dark:text-dungeon-200 hover:text-gold'
            }`}
          >
            [CREATE CAMPAIGN]
          </button>
          <button
            onClick={() => setMode('join')}
            className={`text-mono text-sm px-4 py-2 pixel-border transition-all ${
              mode === 'join'
                ? 'bg-gold text-dungeon-900'
                : 'bg-parchment-300 dark:bg-dungeon-600 text-parchment-700 dark:text-dungeon-200 hover:text-gold'
            }`}
          >
            [JOIN]
          </button>
        </div>

        {mode === 'create' ? (
          <CreateRoom onCreate={handleCreate} />
        ) : (
          <RoomList rooms={rooms} onJoin={handleJoin} onRefresh={refreshRooms} />
        )}
      </div>
    </div>
  );
}
