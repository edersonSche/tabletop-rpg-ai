import { useState } from 'react';
import { Lobby } from './pages/Lobby';
import { GameRoom } from './pages/GameRoom';
import { SocketProvider } from './hooks/SocketContext';

export default function App() {
  const [inGame, setInGame] = useState(false);

  return (
    <SocketProvider>
      {inGame ? (
        <GameRoom />
      ) : (
        <Lobby onEnterRoom={() => setInGame(true)} />
      )}
    </SocketProvider>
  );
}
