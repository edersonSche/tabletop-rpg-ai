import { SocketProvider } from './hooks/SocketContext';
import { useSocket } from './hooks/useSocket';
import { Login } from './pages/Login';
import { Lobby } from './pages/Lobby';
import { CharacterCreation } from './pages/CharacterCreation';
import { WaitingRoom } from './pages/WaitingRoom';
import { GameRoom } from './pages/GameRoom';
import { Toast } from './components/Layout/Toast';

function RoomRouter() {
  const { page } = useSocket();

  switch (page) {
    case 'login':
      return <Login />;
    case 'lobby':
      return <Lobby />;
    case 'character_creation':
      return <CharacterCreation />;
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
      <Toast />
    </SocketProvider>
  );
}
