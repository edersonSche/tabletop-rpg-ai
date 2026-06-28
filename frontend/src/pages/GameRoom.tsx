import { Logout, AiUserCircle } from 'pixelarticons/react';
import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameTurn } from '../hooks/useGameTurn';
import { Header } from '../components/Layout/Header';
import { MessageList } from '../components/Chat/MessageList';
import { MessageInput } from '../components/Chat/MessageInput';
import { DiceRollButton } from '../components/Chat/DiceRollButton';
import { PlayerList } from '../components/GameStatus/PlayerList';
import { TurnIndicator } from '../components/GameStatus/TurnIndicator';
import { TypingIndicator } from '../components/GameStatus/TypingIndicator';
import { LocationBadge } from '../components/GameStatus/LocationBadge';
import { CharacterSheet } from '../components/GameStatus/CharacterSheet';

export function GameRoom() {
  const [showSheet, setShowSheet] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const {
    player,
    gameState,
    messages,
    turnUpdate,
    typingPlayers,
    isAiProcessing,
    sendAction,
    sendRoll,
    startCampaign,
    leaveRoom,
    emitTyping,
    emitTypingStop,
  } = useSocket();

  const isCreator = player.playerId === gameState?.creatorId;

  const {
    isMyTurn, isRollRequest, isInputDisabled,
    isRollDisabled, disabledReason,
  } = useGameTurn({ gameState, turnUpdate, playerId: player.playerId, isAiProcessing });

  const handleSend = (message: string) => {
    sendAction(message);
  };

  const handleRoll = () => {
    sendRoll();
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveRoom();
    } catch {
      setLeaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dungeon-800">
      <Header />

      <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-dungeon-900 border-r-2 border-dungeon-600 p-3 hidden md:flex flex-col gap-4">
          {gameState && (
            <>
              <LocationBadge location={gameState.currentLocation} />
              <TurnIndicator
                currentTurn={turnUpdate?.currentTurn || null}
                type={turnUpdate?.type || null}
                target={turnUpdate?.target || null}
                players={gameState.players}
                playerId={player.playerId}
              />
              <PlayerList
                players={gameState.players}
                currentTurn={turnUpdate?.currentTurn || null}
                playerId={player.playerId}
              />
              <div className="flex-1" />
              <button
                onClick={() => setShowSheet(true)}
                className="text-mono text-sm text-magic hover:text-magic/80 transition-colors flex items-center gap-1"
              >
                <AiUserCircle width={14} height={14} />
                Character
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving || isAiProcessing}
                className="text-mono text-sm text-blood hover:text-blood/80 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Logout width={14} height={14} />
                {leaving ? 'LEAVING...' : (isCreator ? 'Close campaign' : 'Leave campaign')}
              </button>
            </>
          )}
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-dungeon-800 bg-noise">
          {/* Mobile top bar */}
          <div className="md:hidden bg-dungeon-900 border-b border-dungeon-600 p-2 flex items-center justify-between px-4">
            {gameState && (
              <>
                <div className="flex items-center gap-2">
                  <TurnIndicator
                  currentTurn={turnUpdate?.currentTurn || null}
                  type={turnUpdate?.type || null}
                  target={turnUpdate?.target || null}
                  players={gameState.players}
                  playerId={player.playerId}
                />
                  <LocationBadge location={gameState.currentLocation} />
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setShowSheet(true)}
                    className="text-magic hover:text-magic/80 transition-colors mr-1"
                    title="Character sheet"
                  >
                    <AiUserCircle width={18} height={18} />
                  </button>
                  {gameState.players.slice(0, 3).map(p => (
                    <span key={p.id} className={`w-6 h-6 flex items-center justify-center text-xs pixel-border ${
                      p.id === turnUpdate?.currentTurn ? 'bg-gold text-dungeon-900' : 'bg-dungeon-600 text-dungeon-300'
                    }`}>
                      {p.name[0]}
                    </span>
                  ))}
                  <button
                    onClick={handleLeave}
                    disabled={leaving || isAiProcessing}
                    className="text-blood hover:text-blood/80 disabled:opacity-50 ml-1"
                    title={isCreator ? 'Close campaign' : 'Leave campaign'}
                  >
                    <Logout width={16} height={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          <MessageList messages={messages} isProcessing={isAiProcessing} />

          <div className="px-4">
            <TypingIndicator typingPlayers={typingPlayers} playerId={player.playerId} />
          </div>

          <div className="flex items-center gap-2 px-3 pb-3 pt-1">
            <div className="flex-1">
              <MessageInput
                onSend={handleSend}
                onTyping={emitTyping}
                onTypingStop={emitTypingStop}
                disabled={isInputDisabled}
                disabledReason={disabledReason}
                characterName={gameState?.players.find(p => p.id === player.playerId)?.name || 'Aventureiro'}
                turnType={turnUpdate?.type || null}
              />
            </div>
            <DiceRollButton
              onRoll={handleRoll}
              disabled={isRollDisabled}
              show={isRollRequest}
            />
          </div>
        </div>
      </div>

      <CharacterSheet
        player={gameState?.players.find(p => p.id === player.playerId)}
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
      />
    </div>
  );
}
