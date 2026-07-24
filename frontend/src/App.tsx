import { useEffect } from "react";
import { AppProviders } from "./contexts/AppProviders";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { Login } from "./pages/Login";
import { Lobby } from "./pages/Lobby";
import { CharacterCreation } from "./pages/CharacterCreation";
import { WaitingRoom } from "./pages/WaitingRoom";
import { GameRoom } from "./pages/GameRoom";
import { Toast } from "./components/Layout/Toast";
import { ErrorBoundary } from "./components/Layout/ErrorBoundary";

function RoomRouter() {
  const { page } = useAuth();
  const { gameState } = useGame();

  useEffect(() => {
    const name = gameState?.campaignName;
    switch (page) {
      case "login":
        document.title = "Tabletop RPG AI - Login";
        break;
      case "lobby":
        document.title = "Tabletop RPG AI - Lobby";
        break;
      case "character_creation":
        document.title = "Tabletop RPG AI - Character Creation";
        break;
      case "waiting_room":
        document.title = name
          ? `${name} - Waiting Room`
          : "Tabletop RPG AI - Waiting Room";
        break;
      case "game_room":
        document.title = name ? `${name} - Tabletop RPG AI` : "Tabletop RPG AI";
        break;
    }
  }, [page, gameState?.campaignName]);

  switch (page) {
    case "login":
      return <Login />;
    case "lobby":
      return <Lobby />;
    case "character_creation":
      return <CharacterCreation />;
    case "waiting_room":
      return <WaitingRoom />;
    case "game_room":
      return <GameRoom />;
  }
}

function AppContent() {
  const { dispatch } = useAuth();
  return (
    <ErrorBoundary onGoToLobby={() => dispatch({ type: 'LEFT_ROOM' })}>
      <RoomRouter />
      <Toast />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
