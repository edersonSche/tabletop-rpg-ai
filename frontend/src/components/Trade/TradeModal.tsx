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
      if (!insideTrigger && !insidePopup) setIsOpen(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [isOpen]);

  const handleMouseEnter = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      let left = rect.left;
      if (left + 256 > window.innerWidth) left = window.innerWidth - 260;
      if (left < 0) left = 4;
      setPos({ top: rect.bottom, left });
    }
    setIsOpen(true);
  };

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter}>
      {children}
      {isOpen && createPortal(
        <div ref={popupRef} className="fixed z-[60]" style={{ top: pos.top, left: pos.left, width: '256px' }}>
          <div className="pixel-border bg-navy-800 shadow-lg border border-stone-700/20">
            {content(() => setIsOpen(false))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function MerchantItemDetail({ item, playerCoins }: { item: MerchantItem; playerCoins: number }) {
  const Icon = ITEM_TYPE_ICONS[item.type] || Box;
  const canAfford = playerCoins >= item.buyPrice;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-navy-900 pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={18} height={18} className="text-gold-400" />
        </div>
        <div className="min-w-0">
          <div className="font-pixel text-[8px] text-gold-400 truncate">{item.name}</div>
          <div className="font-pixel text-[6px] text-stone-600">{item.buyPrice}g &middot; Stock: {item.quantity}</div>
        </div>
      </div>
      <div className="font-pixel text-[7px] text-stone-400 mb-3">{item.description}</div>
      {item.antidoteFor && (
        <div className="mb-2 p-1 bg-forest-800/30 border border-forest-600/30 pixel-border">
          <span className="font-pixel text-[6px] text-forest-600">Antidote: {item.antidoteFor}</span>
        </div>
      )}
      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-pixel text-[6px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => <EffectRow key={i} effect={ef} />)}
        </div>
      )}
      <div className={`font-pixel text-[7px] text-right ${canAfford ? 'text-gold-500' : 'text-blood-600'}`}>
        {canAfford ? `You have ${playerCoins}g` : `Too expensive (${playerCoins}g)`}
      </div>
    </div>
  );
}

function PlayerItemDetail({ item, sellPrice, merchantCoins }: { item: InventoryItem; sellPrice: number; merchantCoins: number }) {
  const Icon = ITEM_TYPE_ICONS[item.type] || Box;
  const merchantCanAfford = merchantCoins >= sellPrice;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-navy-900 pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={18} height={18} className="text-gold-400" />
        </div>
        <div className="min-w-0">
          <div className="font-pixel text-[8px] text-gold-400 truncate">{item.name}</div>
          {item.quantity > 1 && <div className="font-pixel text-[6px] text-stone-600">x{item.quantity}</div>}
        </div>
      </div>
      <div className="font-pixel text-[7px] text-stone-400 mb-3">{item.description}</div>
      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-pixel text-[6px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => <EffectRow key={i} effect={ef} />)}
        </div>
      )}
      <div className={`font-pixel text-[7px] text-right ${merchantCanAfford ? 'text-gold-500' : 'text-blood-600'}`}>
        Sell for {sellPrice}g &middot; Merchant has {merchantCoins}g
      </div>
    </div>
  );
}

export function TradeModal({
  merchants, playerCoins, playerInventory, tradeParticipants, tradeDone,
  playerId, playerName, isCreator, onBuyItem, onSellItem, onEndTrade, onForceEnd,
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
    const match = merchant?.inventory?.find(mi => mi.name === item.name && mi.type === item.type);
    return match ? match.sellPrice : 5;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80">
      <div className="pixel-border bg-navy-800 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-700/20">
          <h2 className="font-pixel text-[10px] text-gold-400 tracking-wider text-shadow-glow-gold">THE MARKETPLACE</h2>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[7px] text-stone-500">
              {allDoneCount}/{totalCount} done
            </span>
            <span className="flex items-center gap-1 font-pixel text-[8px] text-gold-400">
              <Wallet width={12} height={12} />{playerCoins}g
            </span>
          </div>
        </div>

        {/* Merchant Tabs */}
        <div className="p-1 flex border-b border-stone-700/20 overflow-x-auto">
          {merchants.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setActiveMerchant(i); setConfirmBuy(null); setConfirmSell(null); }}
              className={`px-4 py-2 font-pixel text-[8px] whitespace-nowrap transition-all border-r border-stone-700/15 last:border-r-0 ${
                i === activeMerchant ? 'bg-navy-700 text-gold-400' : 'bg-navy-800 text-stone-500 hover:bg-navy-700 hover:text-stone-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {merchant && (
          <div className="flex flex-col">
            <p className="px-4 pt-3 font-pixel text-[7px] text-stone-500 italic">&ldquo;{merchant.greeting}&rdquo;</p>

            <div className="flex-1 overflow-hidden flex gap-4 p-4">
              {/* Left: Merchant Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <div className="font-pixel text-[7px] text-stone-500 tracking-wider">WARES</div>
                  <span className="font-pixel text-[6px] text-stone-600">{merchant.coins}g</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-quest">
                  {merchant.inventory.length === 0 ? (
                    <p className="font-pixel text-[7px] text-stone-500">Nothing available.</p>
                  ) : (
                    merchant.inventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const canAfford = playerCoins >= item.buyPrice;
                      const row = (
                        <div key={item.id} className="bg-navy-900 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-navy-700 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={12} height={12} className="text-stone-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-pixel text-[7px] text-stone-300 truncate">{item.name}</div>
                            <div className="font-pixel text-[6px] text-stone-600">{item.buyPrice}g &middot; {item.quantity}</div>
                          </div>
                          <button
                            onClick={() => handleBuy(item.id)}
                            disabled={!canAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 font-pixel text-[6px] pixel-border transition-all disabled:opacity-30 ${
                              confirmBuy === item.id
                                ? 'bg-blood-700/50 border-blood-600/50 text-stone-300'
                                : 'bg-gold-500/15 border-gold-500/25 text-gold-400 hover:bg-gold-500/25'
                            }`}
                          >
                            {item.quantity < 1 ? 'EMPTY' : !canAfford ? 'PRICEY' : confirmBuy === item.id ? 'BUY?' : 'BUY'}
                          </button>
                        </div>
                      );
                      return (
                        <TradeHoverPopup key={item.id} content={(close) => <MerchantItemDetail item={item} playerCoins={playerCoins} />}>
                          {row}
                        </TradeHoverPopup>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Player Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="font-pixel text-[7px] text-stone-500 mb-2 tracking-wider flex-shrink-0">YOUR WARES</div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-quest">
                  {playerInventory.length === 0 ? (
                    <p className="font-pixel text-[7px] text-stone-500">Nothing to sell.</p>
                  ) : (
                    playerInventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const sellPrice = sellPriceFor(item);
                      const merchantCanAfford = merchant.coins >= sellPrice;
                      const row = (
                        <div key={item.id} className="bg-navy-900 px-2 py-1.5 pixel-border flex items-center gap-2 hover:bg-navy-700 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={12} height={12} className="text-stone-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-pixel text-[7px] text-stone-300 truncate">{item.name}</div>
                            <div className="font-pixel text-[6px] text-stone-600">{sellPrice}g{item.quantity > 1 ? ` &middot; x${item.quantity}` : ''}</div>
                          </div>
                          <button
                            onClick={() => handleSell(item)}
                            disabled={!merchantCanAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 font-pixel text-[6px] pixel-border transition-all disabled:opacity-30 ${
                              confirmSell === item.id
                                ? 'bg-blood-700/50 border-blood-600/50 text-stone-300'
                                : 'bg-gold-500/15 border-gold-500/25 text-gold-400 hover:bg-gold-500/25'
                            }`}
                          >
                            {item.quantity < 1 ? 'EMPTY' : !merchantCanAfford ? 'NO GOLD' : confirmSell === item.id ? 'SELL?' : 'SELL'}
                          </button>
                        </div>
                      );
                      return (
                        <TradeHoverPopup key={item.id} content={(close) => <PlayerItemDetail item={item} sellPrice={sellPrice} merchantCoins={merchant.coins} />}>
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
        <div className="flex items-center justify-between p-4 border-t border-stone-700/20">
          <div className="font-pixel text-[7px] text-stone-600">
            {iAmDone ? 'Awaiting others...' : `Done: ${allDoneCount}/${totalCount}`}
          </div>
          <div className="flex gap-2">
            {isCreator && onForceEnd && (
              <button onClick={onForceEnd} className="btn-danger !py-1.5 !px-3 !text-[7px]">
                FORCE END
              </button>
            )}
            <button
              onClick={onEndTrade}
              disabled={iAmDone}
              className="btn-gold !py-1.5 !px-3 !text-[7px]"
            >
              {iAmDone ? 'WAITING...' : 'DONE TRADING'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
