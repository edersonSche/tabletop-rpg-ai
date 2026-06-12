import { SocketProvider } from './hooks/SocketContext';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './pages/Lobby';
import { WaitingRoom } from './pages/WaitingRoom';
import { GameRoom } from './pages/GameRoom';

function RoomRouter() {
  const { player, gameState } = useSocket();

  if (!player.roomId) return <Lobby />;
  if (!gameState?.scene) return <WaitingRoom />;
  return <GameRoom />;
}

export default function App() {
  return (
    <SocketProvider>
      <RoomRouter />
    </SocketProvider>
  );
}
