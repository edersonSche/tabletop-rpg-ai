import { Users, AiSettings2, Logout } from 'pixelarticons/react';
import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameTurn } from '../hooks/useGameTurn';
import { Header } from '../components/Layout/Header';
import { MessageList } from '../components/Chat/MessageList';
import { MessageInput } from '../components/Chat/MessageInput';
import { DiceRollButton } from '../components/Chat/DiceRollButton';
import { TypingIndicator } from '../components/GameStatus/TypingIndicator';
import { CharacterSheet } from '../components/GameStatus/CharacterSheet';
import { CharacterListModal } from '../components/GameStatus/CharacterListModal';
import { OptionsModal } from '../components/GameStatus/OptionsModal';
import { MyCharacterStatus } from '../components/GameStatus/MyCharacterStatus';
import { CampaignStatusBar } from '../components/GameStatus/CampaignStatusBar';

export function GameRoom() {
  const [showSheet, setShowSheet] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

  const me = gameState?.players.find(p => p.id === player.playerId);
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
        <aside className="w-48 bg-dungeon-900 border-r-2 border-dungeon-600 p-3 flex flex-col gap-4">
          {gameState && (
            <>
              {me && <MyCharacterStatus player={me} onOpenSheet={() => setShowSheet(true)} />}
              <div className="flex-1" />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowCharacterList(true)}
                  className="w-full bg-dungeon-700 pixel-border py-2 px-3 flex items-center gap-2 text-mono text-sm text-dungeon-100 hover:brightness-110 transition-all"
                >
                  <Users width={16} height={16} />
                  Characters ({gameState.players.length})
                </button>
                <button
                  onClick={() => setShowOptions(true)}
                  className="w-full bg-dungeon-700 pixel-border py-2 px-3 flex items-center gap-2 text-mono text-sm text-dungeon-100 hover:brightness-110 transition-all"
                >
                  <AiSettings2 width={16} height={16} />
                  Options
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving || isAiProcessing}
                  className="w-full bg-dungeon-700 pixel-border py-2 px-3 flex items-center gap-2 text-mono text-sm text-blood hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Logout width={16} height={16} />
                  {leaving ? 'LEAVING...' : (isCreator ? 'Close' : 'Leave')}
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-dungeon-800 bg-noise">
          <CampaignStatusBar
            location={gameState?.currentLocation || null}
            currentTurn={turnUpdate?.currentTurn || null}
            turnType={turnUpdate?.type || null}
            turnTarget={turnUpdate?.target || null}
            players={gameState?.players || []}
            playerId={player.playerId}
          />

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
                  characterName={me?.name || 'Aventureiro'}
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
        player={me}
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
      />

      <CharacterListModal
        players={gameState?.players || []}
        currentTurn={turnUpdate?.currentTurn || null}
        playerId={player.playerId}
        isOpen={showCharacterList}
        onClose={() => setShowCharacterList(false)}
      />

      <OptionsModal
        roomId={player.roomId}
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
      />
    </div>
  );
}
