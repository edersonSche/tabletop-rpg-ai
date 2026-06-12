import { useSocket } from '../hooks/useSocket';
import { Header } from '../components/Layout/Header';
import { MessageList } from '../components/Chat/MessageList';
import { MessageInput } from '../components/Chat/MessageInput';
import { DiceRollButton } from '../components/Chat/DiceRollButton';
import { PlayerList } from '../components/GameStatus/PlayerList';
import { TurnIndicator } from '../components/GameStatus/TurnIndicator';
import { TypingIndicator } from '../components/GameStatus/TypingIndicator';
import { LocationBadge } from '../components/GameStatus/LocationBadge';

export function GameRoom() {
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
    emitTyping,
    emitTypingStop,
  } = useSocket();

  const isMyTurn = turnUpdate?.target === player.playerId || turnUpdate?.type === 'group_action' || !turnUpdate?.type;
  const isRollRequest = turnUpdate?.type === 'call_roll' && turnUpdate?.target === player.playerId;

  const disabledReason = !isMyTurn
    ? 'Not your turn'
    : isAiProcessing
      ? 'AI is processing...'
      : undefined;

  const isInputDisabled = !!disabledReason || isRollRequest;
  const isRollDisabled = !!disabledReason;

  const handleSend = (message: string) => {
    sendAction(message);
  };

  const handleRoll = () => {
    sendRoll();
  };

  return (
    <div className="h-screen flex flex-col bg-parchment-200 dark:bg-dungeon-800">
      <Header />

      <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-parchment-300 dark:bg-dungeon-900 border-r-2 border-parchment-400 dark:border-dungeon-600 p-3 hidden md:flex flex-col gap-4">
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
            </>
          )}
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-parchment-200 dark:bg-dungeon-800 bg-noise">
          {/* Mobile top bar */}
          <div className="md:hidden bg-parchment-300 dark:bg-dungeon-900 border-b border-parchment-400 dark:border-dungeon-600 p-2 flex items-center justify-between px-4">
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
                <div className="flex gap-1">
                  {gameState.players.slice(0, 3).map(p => (
                    <span key={p.id} className={`w-6 h-6 flex items-center justify-center text-xs pixel-border ${
                      p.id === turnUpdate?.currentTurn ? 'bg-gold text-dungeon-900' : 'bg-parchment-400 dark:bg-dungeon-600 text-parchment-700 dark:text-dungeon-300'
                    }`}>
                      {p.name[0]}
                    </span>
                  ))}
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
                playerName={gameState?.players.find(p => p.id === player.playerId)?.name || 'Aventureiro'}
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
    </div>
  );
}
