import { useState } from 'react';
import { Close, Wallet, Box } from 'pixelarticons/react';
import { Merchant, MerchantItem, InventoryItem } from '../../types/game.types';
import { EffectRow } from '../GameStatus/CharacterSheet';
import { ITEM_TYPE_ICONS } from '../shared/constants';
import { HoverPopup } from '../shared/HoverPopup';

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

function MerchantItemDetail({ item, playerCoins }: { item: MerchantItem; playerCoins: number }) {
  const Icon = ITEM_TYPE_ICONS[item.type] || Box;
  const canAfford = playerCoins >= item.buyPrice;

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-zinc-900 pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={18} height={18} className="text-gold-400" />
        </div>
        <div className="min-w-0">
          <div className="font-pixel text-[10px] text-gold-400 truncate">{item.name}</div>
          <div className="font-pixel text-[8px] text-stone-600">{item.buyPrice}g &middot; Stock: {item.quantity}</div>
        </div>
      </div>
      <div className="font-pixel text-[9px] text-stone-400 mb-3">{item.description}</div>
      {item.antidoteFor && (
        <div className="mb-2 p-1 bg-forest-800/30 border border-forest-600/30 pixel-border">
          <span className="font-pixel text-[8px] text-forest-600">Antidote: {item.antidoteFor}</span>
        </div>
      )}
      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-pixel text-[8px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => <EffectRow key={i} effect={ef} />)}
        </div>
      )}
      <div className={`font-pixel text-[9px] text-right ${canAfford ? 'text-gold-500' : 'text-blood-600'}`}>
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
        <div className="w-9 h-9 bg-zinc-900 pixel-border flex items-center justify-center flex-shrink-0">
          <Icon width={18} height={18} className="text-gold-400" />
        </div>
        <div className="min-w-0">
          <div className="font-pixel text-[10px] text-gold-400 truncate">{item.name}</div>
          {item.quantity > 1 && <div className="font-pixel text-[8px] text-stone-600">x{item.quantity}</div>}
        </div>
      </div>
      <div className="font-pixel text-[9px] text-stone-400 mb-3">{item.description}</div>
      {item.effects && item.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-pixel text-[8px] text-stone-500 mb-1 tracking-wider">EFFECTS</div>
          {item.effects.map((ef, i) => <EffectRow key={i} effect={ef} />)}
        </div>
      )}
      <div className={`font-pixel text-[9px] text-right ${merchantCanAfford ? 'text-gold-500' : 'text-blood-600'}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="pixel-border-ornate bg-panel-950 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="panel-header flex-1 mb-0">
            <h2 className="font-pixel text-[13px] text-gold-400 tracking-wider text-shadow-glow-gold">THE MARKETPLACE</h2>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="font-pixel text-[9px] text-stone-500">
              {allDoneCount}/{totalCount} done
            </span>
            <span className="flex items-center gap-1 font-pixel text-[10px] text-gold-400">
              <Wallet width={12} height={12} />{playerCoins}g
            </span>
          </div>
        </div>

        {/* Merchant Tabs */}
        <div className="p-1 flex border-b border-zinc-800 overflow-x-auto">
          {merchants.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setActiveMerchant(i); setConfirmBuy(null); setConfirmSell(null); }}
              className={`px-4 py-2 font-pixel text-[10px] whitespace-nowrap transition-all border-r border-zinc-800 last:border-r-0 ${
                i === activeMerchant ? 'bg-panel-800 text-gold-400' : 'bg-panel-950 text-stone-500 hover:bg-panel-800 hover:text-stone-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {merchant && (
          <div className="flex flex-col">
            <p className="px-4 pt-3 font-pixel text-[9px] text-stone-500 italic">&ldquo;{merchant.greeting}&rdquo;</p>

            <div className="flex-1 overflow-hidden flex gap-4 p-4">
              {/* Left: Merchant Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <div className="font-pixel text-[9px] text-stone-500 tracking-wider">WARES</div>
                  <span className="font-pixel text-[8px] text-stone-600">{merchant.coins}g</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-quest">
                  {merchant.inventory.length === 0 ? (
                    <p className="font-pixel text-[9px] text-stone-500">Nothing available.</p>
                  ) : (
                    merchant.inventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const canAfford = playerCoins >= item.buyPrice;
                      const row = (
                        <div key={item.id} className="bg-zinc-900 border border-zinc-800 px-2 py-1.5 flex items-center gap-2 hover:bg-panel-800 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={12} height={12} className="text-stone-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-pixel text-[9px] text-stone-300 truncate">{item.name}</div>
                            <div className="font-pixel text-[8px] text-stone-600">{item.buyPrice}g &middot; {item.quantity}</div>
                          </div>
                          <button
                            onClick={() => handleBuy(item.id)}
                            disabled={!canAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 btn-rpg !text-[8px] !py-1 !px-2 disabled:opacity-30 ${
                              confirmBuy === item.id
                                ? '!bg-blood-700 !text-stone-300'
                                : ''
                            }`}
                          >
                            {item.quantity < 1 ? 'EMPTY' : !canAfford ? 'PRICEY' : confirmBuy === item.id ? 'BUY?' : 'BUY'}
                          </button>
                        </div>
                      );
                      return (
                        <HoverPopup key={item.id} content={(close) => <MerchantItemDetail item={item} playerCoins={playerCoins} />}>
                          {row}
                        </HoverPopup>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Player Items */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="font-pixel text-[9px] text-stone-500 mb-2 tracking-wider flex-shrink-0">YOUR WARES</div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-quest">
                  {playerInventory.length === 0 ? (
                    <p className="font-pixel text-[9px] text-stone-500">Nothing to sell.</p>
                  ) : (
                    playerInventory.map(item => {
                      const Icon = ITEM_TYPE_ICONS[item.type] || Box;
                      const sellPrice = sellPriceFor(item);
                      const merchantCanAfford = merchant.coins >= sellPrice;
                      const row = (
                        <div key={item.id} className="bg-zinc-900 border border-zinc-800 px-2 py-1.5 flex items-center gap-2 hover:bg-panel-800 transition-all">
                          <div className="flex-shrink-0 w-5 flex items-center justify-center">
                            <Icon width={12} height={12} className="text-stone-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-pixel text-[9px] text-stone-300 truncate">{item.name}</div>
                            <div className="font-pixel text-[8px] text-stone-600">{sellPrice}g{item.quantity > 1 ? ` &middot; x${item.quantity}` : ''}</div>
                          </div>
                          <button
                            onClick={() => handleSell(item)}
                            disabled={!merchantCanAfford || item.quantity < 1}
                            className={`flex-shrink-0 px-2 py-1 btn-rpg !text-[8px] !py-1 !px-2 disabled:opacity-30 ${
                              confirmSell === item.id
                                ? '!bg-blood-700 !text-stone-300'
                                : ''
                            }`}
                          >
                            {item.quantity < 1 ? 'EMPTY' : !merchantCanAfford ? 'NO GOLD' : confirmSell === item.id ? 'SELL?' : 'SELL'}
                          </button>
                        </div>
                      );
                      return (
                        <HoverPopup key={item.id} content={(close) => <PlayerItemDetail item={item} sellPrice={sellPrice} merchantCoins={merchant.coins} />}>
                          {row}
                        </HoverPopup>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800">
          <div className="font-pixel text-[9px] text-stone-600">
            {iAmDone ? 'Awaiting others...' : `Done: ${allDoneCount}/${totalCount}`}
          </div>
          <div className="flex gap-2">
            {isCreator && onForceEnd && (
              <button onClick={onForceEnd} className="btn-danger !py-1.5 !px-3 !text-[9px]">
                FORCE END
              </button>
            )}
            <button
              onClick={onEndTrade}
              disabled={iAmDone}
              className="btn-rpg !py-1.5 !px-3 !text-[9px]"
            >
              {iAmDone ? 'WAITING...' : 'DONE TRADING'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
