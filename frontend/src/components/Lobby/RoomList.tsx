import { useState } from 'react';

interface RoomListProps {
  onJoin: (roomId: string) => void;
}

export function RoomList({ onJoin }: RoomListProps) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    onJoin(roomCode.trim());
  };

  return (
    <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
      <h2 className="text-pixel text-gold text-lg mb-4">JOIN CAMPAIGN</h2>

      <div className="space-y-4">
        <div>
          <label className="text-mono text-sm text-dungeon-200 block mb-1">Campaign Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            className="w-full bg-dungeon-700 text-dungeon-100 p-2 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors uppercase"
            placeholder="e.g. a1b2c3d4"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={!roomCode.trim()}
          className="w-full bg-gold text-dungeon-900 py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          JOIN
        </button>
      </div>
    </div>
  );
}
