import { File, Users, AiSettings2, Logout, Wallet } from 'pixelarticons/react';
import { useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useGame } from '../hooks/useGame';
import { useTrade } from '../hooks/useTrade';
import { useInventory } from '../hooks/useInventory';
import { useGameTurn } from '../hooks/useGameTurn';
import { Header } from '../components/Layout/Header';
import { MessageList } from '../components/Chat/MessageList';
import { MessageInput } from '../components/Chat/MessageInput';
import { DiceRollButton } from '../components/Chat/DiceRollButton';
import { UseItemButton } from '../components/Chat/UseItemButton';
import { TypingIndicator } from '../components/GameStatus/TypingIndicator';
import { CharacterSheet } from '../components/GameStatus/CharacterSheet';
import { CharacterListModal } from '../components/GameStatus/CharacterListModal';
import { OptionsModal } from '../components/GameStatus/OptionsModal';
import { AttributeAllocationModal } from '../components/GameStatus/AttributeAllocationModal';
import { MyCharacterStatus } from '../components/GameStatus/MyCharacterStatus';
import { CampaignStatusBar } from '../components/GameStatus/CampaignStatusBar';
import { TradeModal } from '../components/Trade/TradeModal';

export function GameRoom() {
  const [showSheet, setShowSheet] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAttributeAllocation, setShowAttributeAllocation] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { player, leaveRoom, allocateAttributes } = usePlayer();
  const { gameState, messages, turnUpdate, typingPlayers, isAiProcessing, sendAction, sendRoll, startCampaign, emitTyping, emitTypingStop } = useGame();
  const { tradeState, isTradeLocked, initiateTrade, buyItem, sellItem, endTrade } = useTrade();
  const { emitUseItem } = useInventory();

  const me = gameState?.players.find(p => p.id === player.playerId);
  const isCreator = player.playerId === gameState?.creatorId;

  const {
    isMyTurn, isRollRequest, isInputDisabled,
    isRollDisabled, disabledReason,
  } = useGameTurn({ gameState, turnUpdate, playerId: player.playerId, isAiProcessing, isTradeLocked });

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
    <div className="h-screen flex flex-col bg-navy-900">
      <Header />

      <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 bg-navy-800 border-r border-gold-500/15 flex flex-col">
          {gameState && (
            <>
              <div className="p-3 flex flex-col gap-3 flex-1">
                {me && <MyCharacterStatus player={me} />}
                {me && me.pendingAttributePoints > 0 && (
                  <button
                    onClick={() => setShowAttributeAllocation(true)}
                    className="w-full btn-gold !py-2 !px-3 !text-[8px]"
                  >
                    ATTRIBUTE PTS ({me.pendingAttributePoints})
                  </button>
                )}

                <div className="flex-1" />

                <div className="flex flex-col gap-1.5">
                  <SidebarButton
                    icon={<File width={14} height={14} />}
                    label="Sheet"
                    onClick={() => setShowSheet(true)}
                  />
                  <SidebarButton
                    icon={<Users width={14} height={14} />}
                    label={`Party (${gameState.players.length})`}
                    onClick={() => setShowCharacterList(true)}
                  />
                  <SidebarButton
                    icon={<AiSettings2 width={14} height={14} />}
                    label="Options"
                    onClick={() => setShowOptions(true)}
                  />
                  <SidebarButton
                    icon={<Wallet width={14} height={14} />}
                    label="Trade"
                    onClick={initiateTrade}
                    disabled={!gameState?.gameStarted || isAiProcessing || isTradeLocked}
                    accent="gold"
                  />
                  <div className="divider-gold my-1" />
                  <SidebarButton
                    icon={<Logout width={14} height={14} />}
                    label={leaving ? 'LEAVING...' : (isCreator ? 'Close' : 'Leave')}
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
        <div className="flex-1 flex flex-col bg-navy-900 bg-noise">
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
                characterName={me?.name || 'Adventurer'}
                turnType={turnUpdate?.type || null}
              />
            </div>
            <UseItemButton
              items={me?.inventory || []}
              onUseItem={emitUseItem}
            />
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

      <AttributeAllocationModal
        player={me}
        isOpen={showAttributeAllocation}
        onClose={() => setShowAttributeAllocation(false)}
        onAllocate={allocateAttributes}
      />

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
          onBuyItem={(merchantId, itemId, qty) => buyItem(merchantId, itemId, qty)}
          onSellItem={(merchantId, itemId, qty) => sellItem(merchantId, itemId, qty)}
          onEndTrade={endTrade}
        />
      )}
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  onClick,
  disabled,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: 'gold' | 'danger';
}) {
  const colorClass = accent === 'danger'
    ? 'text-blood-600 hover:text-blood-500 hover:bg-blood-700/20'
    : accent === 'gold'
    ? 'text-gold-500 hover:text-gold-400 hover:bg-gold-500/10'
    : 'text-stone-400 hover:text-gold-400 hover:bg-navy-600';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-2 font-pixel text-[8px] tracking-wider transition-all ${colorClass} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {icon}
      {label}
    </button>
  );
}
