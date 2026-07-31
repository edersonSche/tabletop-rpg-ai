import {
  File,
  Users,
  AiSettings2,
  Logout,
  Wallet,
  User,
} from "pixelarticons/react";
import { useState, useEffect, useMemo } from "react";
import { usePlayer } from "../hooks/usePlayer";
import { useGame } from "../hooks/useGame";
import { useTrade } from "../hooks/useTrade";
import { useInventory } from "../hooks/useInventory";
import { useGameTurn } from "../hooks/useGameTurn";
import { useAuth } from "../hooks/useAuth";
import { Header } from "../components/Layout/Header";
import { ErrorBoundary } from "../components/Layout/ErrorBoundary";
import { MessageList } from "../components/Chat/MessageList";
import { MessageInput } from "../components/Chat/MessageInput";
import { UseItemButton } from "../components/Chat/UseItemButton";
import { RollRequestModal } from "../components/Chat/RollRequestModal";
import { TypingIndicator } from "../components/GameStatus/TypingIndicator";
import { CharacterSheet } from "../components/GameStatus/CharacterSheet";
import { CharacterListModal } from "../components/GameStatus/CharacterListModal";
import { OptionsModal } from "../components/GameStatus/OptionsModal";
import { AttributeAllocationModal } from "../components/GameStatus/AttributeAllocationModal";
import { MyCharacterStatus } from "../components/GameStatus/MyCharacterStatus";
import { CampaignStatusBar } from "../components/GameStatus/CampaignStatusBar";
import { TradeModal } from "../components/Trade/TradeModal";
import { Button, NavButton, Divider, LoadingOverlay } from "../components/ui";

export function GameRoom() {
  const [showSheet, setShowSheet] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAttributeAllocation, setShowAttributeAllocation] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [rollDismissed, setRollDismissed] = useState(false);

  const { player, leaveRoom, allocateAttributes } = usePlayer();
  const {
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
    refetchGameState,
  } = useGame();
  const { dispatch } = useAuth();
  const {
    tradeState,
    isTradeLocked,
    initiateTrade,
    buyItem,
    sellItem,
    endTrade,
  } = useTrade();
  const { emitUseItem } = useInventory();

  const isLoadingState = !gameState && !!player.roomId;
  const me = gameState?.players.find((p) => p.id === player.playerId);
  const isCreator = player.playerId === gameState?.creatorId;

  const {
    isRollRequest,
    actionsLocked,
    isInputDisabled,
    disabledReason,
  } = useGameTurn({
    gameState,
    turnUpdate,
    playerId: player.playerId,
    isAiProcessing,
    isTradeLocked,
  });

  useEffect(() => {
    setRollDismissed(false);
  }, [turnUpdate]);

  const rollPrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === "narration") return messages[i].content;
    }
    return "";
  }, [messages]);

  const showRollModal = isRollRequest && !rollDismissed;

  const handleSend = (message: string) => {
    sendAction(message);
  };

  const handleRoll = () => {
    setRollDismissed(true);
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

  if (isLoadingState) {
    return (
      <ErrorBoundary
        onRetry={refetchGameState}
        onGoToLobby={() => dispatch({ type: "LEFT_ROOM" })}
      >
        <div className="h-screen bg-navy-950 flex flex-col items-center justify-center">
          <Header />
          <div className="flex-1 flex flex-col items-center justify-center">
            <LoadingOverlay
              title="SUMMONING THE REALM..."
              subtitle="The ancient forces are gathering"
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      onRetry={refetchGameState}
      onGoToLobby={() => dispatch({ type: "LEFT_ROOM" })}
    >
      <div className="h-screen flex flex-col bg-panel-950">
        <Header />

        <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
          {/* Sidebar */}
          <aside className="w-48 bg-panel-900 border-r-2 border-zinc-800 flex flex-col">
            {gameState && (
              <>
                <div className="p-3 flex flex-col gap-3 flex-1">
                  {me && <MyCharacterStatus player={me} />}
                  {me && me.pendingAttributePoints > 0 && (
                    <Button
                      onClick={() => setShowAttributeAllocation(true)}
                      size="sm"
                      fullWidth
                      disabled={actionsLocked}
                    >
                      ATTRIBUTE PTS ({me.pendingAttributePoints})
                    </Button>
                  )}

                  <div className="flex-1" />

                  <div className="flex flex-col gap-1.5">
                    <NavButton
                      icon={<User width={14} height={14} />}
                      label="Character"
                      onClick={() => setShowSheet(true)}
                    />
                    <NavButton
                      icon={<Users width={14} height={14} />}
                      label={`Party (${gameState.players.length})`}
                      onClick={() => setShowCharacterList(true)}
                    />
                    <NavButton
                      icon={<AiSettings2 width={14} height={14} />}
                      label="Options"
                      onClick={() => setShowOptions(true)}
                    />
                    <NavButton
                      icon={<Wallet width={14} height={14} />}
                      label="Trade"
                      onClick={initiateTrade}
                      disabled={
                        !gameState?.gameStarted ||
                        actionsLocked
                      }
                      accent="gold"
                    />
                    <Divider variant="gold" className="my-1" />
                    <NavButton
                      icon={<Logout width={14} height={14} />}
                      label={
                        leaving ? "LEAVING..." : isCreator ? "Close" : "Leave"
                      }
                      onClick={handleLeave}
                      disabled={leaving || isAiProcessing}
                      accent="danger"
                    />
                  </div>
                </div>
              </>
            )}
          </aside>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-panel-950 bg-noise">
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
              <TypingIndicator
                typingPlayers={typingPlayers}
                playerId={player.playerId}
              />
            </div>

            <div className="flex items-center gap-2 px-3 pb-3 pt-1">
              <div className="flex-1">
                <MessageInput
                  onSend={handleSend}
                  onTyping={emitTyping}
                  onTypingStop={emitTypingStop}
                  disabled={isInputDisabled}
                  disabledReason={disabledReason}
                  characterName={me?.name || "Adventurer"}
                  turnType={turnUpdate?.type || null}
                />
              </div>
              <UseItemButton
                items={me?.inventory || []}
                onUseItem={emitUseItem}
                disabled={actionsLocked}
              />
            </div>
          </div>
        </div>

        <CharacterSheet
          player={me}
          isOpen={showSheet}
          onClose={() => setShowSheet(false)}
          disabled={actionsLocked}
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

        <AttributeAllocationModal
          player={me}
          isOpen={showAttributeAllocation}
          onClose={() => setShowAttributeAllocation(false)}
          onAllocate={allocateAttributes}
          disabled={actionsLocked}
        />

        {showRollModal && (
          <RollRequestModal
            narration={rollPrompt}
            skill={turnUpdate?.skill}
            dc={turnUpdate?.dc}
            onRoll={handleRoll}
          />
        )}

        {tradeState?.locked && tradeState.merchants && me && (
          <TradeModal
            merchants={tradeState.merchants}
            playerCoins={me.coins}
            playerInventory={me.inventory}
            tradeParticipants={tradeState.tradeParticipants || []}
            tradeDone={tradeState.tradeDone || []}
            playerId={player.playerId}
            playerName={me.name}
            isCreator={isCreator}
            onBuyItem={(merchantId, itemId, qty) =>
              buyItem(merchantId, itemId, qty)
            }
            onSellItem={(merchantId, itemId, qty) =>
              sellItem(merchantId, itemId, qty)
            }
            onEndTrade={endTrade}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
