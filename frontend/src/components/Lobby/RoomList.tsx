import { useState, useEffect } from 'react';

interface Room {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
}

interface RoomListProps {
  rooms: Room[];
  onJoin: (roomId: string, playerName: string) => void;
  onRefresh: () => void;
}

export function RoomList({ rooms, onJoin, onRefresh }: RoomListProps) {
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('rpg_player_name');
    if (saved) setPlayerName(saved);
  }, []);

  const handleJoin = (roomId: string) => {
    if (!playerName.trim()) return;
    localStorage.setItem('rpg_player_name', playerName.trim());
    onJoin(roomId, playerName.trim());
  };

  return (
    <div className="pixel-border bg-parchment-100 dark:bg-dungeon-500 p-6 rounded-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-pixel text-gold text-lg">ACTIVE CAMPAIGNS</h2>
        <button
          onClick={onRefresh}
          className="text-mono text-gold hover:text-gold/80 transition-colors px-2 py-1"
        >
          [REFRESH]
        </button>
      </div>

      <div className="mb-4">
        <label className="text-mono text-sm text-parchment-700 dark:text-dungeon-200 block mb-1">Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          className="w-full bg-parchment-50 dark:bg-dungeon-700 text-parchment-900 dark:text-dungeon-100 p-2 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
          placeholder="Adventurer name"
        />
      </div>

      {rooms.length === 0 ? (
        <p className="text-mono text-parchment-500 dark:text-dungeon-300 text-center py-8">
          No active campaigns. Create one!
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-pixel pr-1">
          {rooms.map(room => (
            <div
              key={room.id}
              className="flex items-center justify-between bg-parchment-50 dark:bg-dungeon-700 p-3 pixel-border"
            >
              <div>
                <p className="text-mono text-lg text-gold">{room.name}</p>
                <p className="text-mono text-sm text-parchment-600 dark:text-dungeon-300">
                  {room.players.length} player(s)
                </p>
              </div>
              <button
                onClick={() => handleJoin(room.id)}
                disabled={!playerName.trim()}
                className="bg-gold text-dungeon-900 px-3 py-2 text-mono text-sm pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                JOIN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
