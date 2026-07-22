import { useState } from 'react';

interface RoomListProps {
  onJoin: (roomId: string) => Promise<void>;
}

export function RoomList({ onJoin }: RoomListProps) {
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || joining) return;
    setJoining(true);
    try {
      await onJoin(roomCode.trim());
    } catch {
      setJoining(false);
    }
  };

  return (
    <div className="card-stone p-5">
      <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-shadow-glow-gold">JOIN CAMPAIGN</h2>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="font-pixel text-[7px] text-stone-400 block mb-2 tracking-wider">CAMPAIGN CODE</label>
          <input
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            className="input-field uppercase"
            placeholder="Enter the code..."
          />
        </div>

        <button type="submit" disabled={!roomCode.trim() || joining} className="btn-primary w-full">
          {joining ? 'ENTERING...' : 'JOIN QUEST'}
        </button>
      </form>
    </div>
  );
}
