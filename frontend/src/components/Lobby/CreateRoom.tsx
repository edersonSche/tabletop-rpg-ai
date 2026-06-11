import { useState } from 'react';

interface CreateRoomProps {
  onCreate: (name: string, playerName: string) => void;
}

export function CreateRoom({ onCreate }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && playerName.trim()) {
      onCreate(roomName.trim(), playerName.trim());
    }
  };

  return (
    <div className="pixel-border bg-parchment-100 dark:bg-dungeon-500 p-6 rounded-none">
        <h2 className="text-pixel text-gold text-lg mb-4 text-center">NEW CAMPAIGN</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-mono text-sm text-parchment-700 dark:text-dungeon-200 block mb-1">Campaign Name</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="w-full bg-parchment-50 dark:bg-dungeon-700 text-parchment-900 dark:text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
            placeholder="e.g. The Dark Forest"
          />
        </div>
        <div>
          <label className="text-mono text-sm text-parchment-700 dark:text-dungeon-200 block mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            className="w-full bg-parchment-50 dark:bg-dungeon-700 text-parchment-900 dark:text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
            placeholder="e.g. Aragorn"
          />
        </div>
        <button
          type="submit"
          disabled={!roomName.trim() || !playerName.trim()}
          className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CREATE CAMPAIGN
        </button>
      </form>
    </div>
  );
}
