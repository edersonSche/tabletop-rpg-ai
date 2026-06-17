import { SocketProvider } from './hooks/SocketContext';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './pages/Lobby';
import { WaitingRoom } from './pages/WaitingRoom';
import { GameRoom } from './pages/GameRoom';

function RoomRouter() {
  const { page } = useSocket();

  switch (page) {
    case 'lobby':
      return <Lobby />;
    case 'waiting_room':
      return <WaitingRoom />;
    case 'game_room':
      return <GameRoom />;
  }
}

export default function App() {
  return (
    <SocketProvider>
      <RoomRouter />
    </SocketProvider>
  );
}
