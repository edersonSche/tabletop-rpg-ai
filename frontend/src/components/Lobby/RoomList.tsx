import { useState } from 'react';
import { Card, PanelTitle, Button, TextField } from '../../components/ui';

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
    <Card padding="md">
      <PanelTitle size="sm" className="mb-4">JOIN CAMPAIGN</PanelTitle>

      <form onSubmit={handleJoin} className="space-y-4">
        <TextField
          label="CAMPAIGN CODE"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value)}
          placeholder="Enter the code..."
          inputClassName="uppercase"
        />

        <Button type="submit" fullWidth disabled={!roomCode.trim() || joining}>
          {joining ? 'ENTERING...' : 'JOIN QUEST'}
        </Button>
      </form>
    </Card>
  );
}
