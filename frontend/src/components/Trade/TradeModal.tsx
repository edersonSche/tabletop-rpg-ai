import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Close, Wallet, Sword, Archive, Potion, BookOpen, Star, Box } from 'pixelarticons/react';
import { Merchant, MerchantItem, InventoryItem } from '../../types/game.types';
import { EffectRow } from '../GameStatus/CharacterSheet';

interface TradeModalProps {
  merchants: Merchant[];
  playerCoins: number;
  playerInventory: InventoryItem[];
  tradeParticipants: string[];
  tradeDone: string[];
  playerId: string;
  playerName: string;
  isCreator: boolean;
  onBuyItem: (merchantId: string, itemId: string, quantity: number) => void;
  onSellItem: (merchantId: string, itemId: string, quantity: number) => void;
  onEndTrade: () => void;
  onForceEnd?: () => void;
}

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ width?: number; height?: number; className?: string }>> = {
  weapon: Sword,
  armor: Archive,
  potion: Potion,
  scroll: BookOpen,
  key_item: Star,
  misc: Box,
};

function TradeHoverPopup({ content, children }: {
  content: (close: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;

    const onMouseMove = (e: MouseEvent) => {
      const tr = trigger.getBoundingClientRect();
      const pr = popup.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;

      const insideTrigger = x >= tr.left && x <= tr.right && y >= tr.top && y <= tr.bottom;
      const insidePopup = x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom;

      if (!insideTrigger && !insidePopup) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [isOpen]);

  const handleMouseEnter = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      let left = rect.left;
      if (left + 256 > window.innerWidth) {
        left = window.innerWidth - 260;
      }
      if (left < 0) left = 4;
      setPos({ top: rect.bottom, left });
    }
    setIsOpen(true);
  };

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter}>
      {children}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[60]"
          style={{ top: pos.top, left: pos.left, width: '256px' }}
        >
          <div className="pixel-border bg-dungeon-700 shadow-lg border border-dungeon-500">
            {content(() => setIsOpen(false))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function MerchantItemDetail({ item, playerCoins, onClose }: {
  item: MerchantItem;
  playerCoins: number;
  onClose: () => void;
}) {
  const Icon = ITEM_TYPE_ICONS[item.type] || Box;
  const canAfford = playerCoins >= item.buyPrice;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-dungeon-900 rounded pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={20} height={20} className="text-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-mono text-sm text-gold truncate">{item.name}</div>
          <div className="text-mono text-[10px] text-dungeon-200">{item.buyPrice} coins · Stock: {item.quantity}</div>
        </div>
      </div>

      <div className="text-mono text-xs text-dungeon-100 mb-3">{item.description}</div>

      {item.antidoteFor && (
        <div className="mb-2 p-1 bg-green-900/30 border border-green-700 pixel-border">
          <span className="text-mono text-[10px] text-green-400">
            Antidote: {item.antidoteFor}
          </span>
        </div>
      )}

      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="text-mono text-[10px] text-dungeon-200 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => (
            <EffectRow key={i} effect={ef} />
          ))}
        </div>
      )}

      <div className={`text-mono text-xs text-right ${canAfford ? 'text-gold' : 'text-blood'}`}>
        {canAfford ? `You have ${playerCoins} coins` : `Too expensive (${playerCoins} coins)`}
      </div>
    </div>
  );
}

function PlayerItemDetail({ item, sellPrice, merchantCoins, onClose }: {
  item: InventoryItem;
  sellPrice: number;
  merchantCoins: number;
  onClose: () => void;
}) {
  const Icon = ITEM_TYPE_ICONS[item.type] || Box;
  const merchantCanAfford = merchantCoins >= sellPrice;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-dungeon-900 rounded pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={20} height={20} className="text-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-mono text-sm text-gold truncate">{item.name}</div>
          {item.quantity > 1 && (
            <div className="text-mono text-[10px] text-dungeon-200">x{item.quantity}</div>
          )}
        </div>
      </div>

      <div className="text-mono text-xs text-dungeon-100 mb-3">{item.description}</div>

      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="text-mono text-[10px] text-dungeon-200 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => (
            <EffectRow key={i} effect={ef} />
          ))}
        </div>
      )}

      <div className={`text-mono text-xs text-right ${merchantCanAfford ? 'text-gold' : 'text-blood'}`}>
        Sell for {sellPrice} coins · Merchant has {merchantCoins} coins
      </div>
    </div>
  );
}

export function TradeModal({
  merchants,
  playerCoins,
  playerInventory,
  tradeParticipants,
  tradeDone,
  playerId,
  playerName,
  isCreator,
  onBuyItem,
  onSellItem,
  onEndTrade,
  onForceEnd,
}: TradeModalProps) {
  const [activeMerchant, setActiveMerchant] = useState(0);
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [confirmSell, setConfirmSell] = useState<string | null>(null);

  const merchant = merchants[activeMerchant];
  const allDoneCount = tradeDone.length;
  const totalCount = tradeParticipants.length;
  const iAmDone = tradeDone.includes(playerId);

  const handleBuy = (itemId: string) => {
    if (confirmBuy === itemId) {
      onBuyItem(merchant.id, itemId, 1);
      setConfirmBuy(null);
    } else {
      setConfirmBuy(itemId);
      setConfirmSell(null);
    }
  };

  const handleSell = (item: InventoryItem) => {
    if (confirmSell === item.id) {
      onSellItem(merchant.id, item.id, 1);
      setConfirmSell(null);
    } else {
      setConfirmSell(item.id);
      setConfirmBuy(null);
    }
  };

  const sellPriceFor = (item: InventoryItem): number => {
    const match = merchant?.inventory?.find(
      mi => mi.name === item.name && mi.type === item.type
    );
    return match ? match.sellPrice : 5;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dungeon-900/80">
      <div
        className="pixel-border bg-dungeon-700 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-dungeon-600">
          <h2 className="text-pixel text-xs text-gold tracking-wider">TRADE</h2>
          <div className="flex items-center gap-3">
            <span className="text-mono text-xs text-dungeon-100">
              {allDoneCount}/{totalCount} players done
            </span>
            <span className="flex items-center gap-1 text-mono text-xs text-gold">
              <Wallet width={14} height={14} />
              {playerCoins}
            </span>
          </div>
        </div>

        {/* Merchant Tabs */}
        <div className="p-1 flex border-b-2  border-dungeon-600 overflow-x-auto">
          {merchants.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setActiveMerchant(i); setConfirmBuy(null); setConfirmSell(null); }}
              className={`px-4 py-2 text-mono text-xs whitespace-nowrap transition-all border-r-2 border-dungeon-600 last:border-r-0 ${
                i === activeMerchant
                  ? 'bg-dungeon-800 text-gold'
                  : 'bg-dungeon-700 text-dungeon-100 hover:bg-dungeon-800'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Two Panel Content */}
        {merchant && (
          <div className="flex flex-col">
            <p className=" p-4 text-mono text-xs text-dungeon-100 italic flex-shrink-0">&ldquo;{merchant.greeting}&rdquo;</p>
          
            <div className="flex-1 overflow-hidden flex gap-4 p-4">
            
              {/* Left: Merchant Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 className="text-mono text-xs text-gold tracking-wider">MERCHANT ITEMS</h3>
                  <span className="text-mono text-[10px] text-dungeon-200">{merchant.coins} coins</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {merchant.inventory.length === 0 ? (
                    <p className="text-mono text-xs text-dungeon-100">Nothing available.</p>
                  ) : (
                    merchant.inventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const canAfford = playerCoins >= item.buyPrice;
                      const row = (
                        <div key={item.id} className="bg-dungeon-600 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-dungeon-500 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={14} height={14} className="text-dungeon-100" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-mono text-xs text-dungeon-100 truncate">{item.name}</div>
                            <div className="text-mono text-[10px] text-dungeon-200">{item.buyPrice} coins · Stock: {item.quantity}</div>
                          </div>
                          <button
                            onClick={() => handleBuy(item.id)}
                            disabled={!canAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 text-mono text-[10px] pixel-border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              confirmBuy === item.id
                                ? 'bg-blood/80 border-blood text-dungeon-100'
                                : 'bg-gold/20 border-gold text-gold hover:brightness-110'
                            }`}
                          >
                            {item.quantity < 1 ? 'Sold Out' : !canAfford ? 'Expensive' : confirmBuy === item.id ? 'Confirm?' : 'Buy'}
                          </button>
                        </div>
                      );
                      return (
                        <TradeHoverPopup
                          key={item.id}
                          content={(close) => (
                            <MerchantItemDetail item={item} playerCoins={playerCoins} onClose={close} />
                          )}
                        >
                          {row}
                        </TradeHoverPopup>
                      );
                    })
                  )}
                </div>
              </div>
  
              {/* Right: Player Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <h3 className="text-mono text-xs text-gold mb-2 tracking-wider flex-shrink-0">YOUR ITEMS</h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {playerInventory.length === 0 ? (
                    <p className="text-mono text-xs text-dungeon-100">Nothing to sell.</p>
                  ) : (
                    playerInventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const sellPrice = sellPriceFor(item);
                      const merchantCanAfford = merchant.coins >= sellPrice;
                      const row = (
                        <div key={item.id} className="bg-dungeon-600 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-dungeon-500 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={14} height={14} className="text-dungeon-100" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-mono text-xs text-dungeon-100 truncate">{item.name}</div>
                            <div className="text-mono text-[10px] text-dungeon-200">{sellPrice} coins{item.quantity > 1 ? ` · Qty: ${item.quantity}` : ''}</div>
                          </div>
                          <button
                            onClick={() => handleSell(item)}
                            disabled={!merchantCanAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 text-mono text-[10px] pixel-border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              confirmSell === item.id
                                ? 'bg-blood/80 border-blood text-dungeon-100'
                                : 'bg-gold/20 border-gold text-gold hover:brightness-110'
                            }`}
                          >
                            {item.quantity < 1 ? 'No Stock' : !merchantCanAfford ? 'Cannot Afford' : confirmSell === item.id ? 'Confirm?' : 'Sell'}
                          </button>
                        </div>
                      );
                      return (
                        <TradeHoverPopup
                          key={item.id}
                          content={(close) => (
                            <PlayerItemDetail item={item} sellPrice={sellPrice} merchantCoins={merchant.coins} onClose={close} />
                          )}
                        >
                          {row}
                        </TradeHoverPopup>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t-2 border-dungeon-600">
          <div className="text-mono text-xs text-dungeon-300">
            {iAmDone ? 'Waiting for others...' : `Players done: ${allDoneCount}/${totalCount}`}
          </div>
          <div className="flex gap-2">
            {isCreator && onForceEnd && (
              <button
                onClick={onForceEnd}
                className="px-3 py-1 text-mono text-xs text-blood bg-dungeon-800 pixel-border hover:brightness-110 transition-all"
              >
                Force End
              </button>
            )}
            <button
              onClick={onEndTrade}
              disabled={iAmDone}
              className="px-4 py-1 text-mono text-xs bg-gold/20 text-gold pixel-border hover:bg-gold/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {iAmDone ? 'Waiting...' : 'Done Trading'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
