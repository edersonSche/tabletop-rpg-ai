import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocketContext } from './SocketContext';
import { usePlayerContext } from './PlayerContext';
import { TradeState } from '../types/game.types';

interface TradeContextValue {
  tradeState: TradeState | null;
  isTradeLocked: boolean;
  initiateTrade: () => void;
  buyItem: (merchantId: string, merchantItemId: string, quantity?: number) => void;
  sellItem: (merchantId: string, itemId: string, quantity?: number) => void;
  endTrade: () => void;
}

const TradeContext = createContext<TradeContextValue | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const { on, off, emit } = useSocketContext();
  const { player } = usePlayerContext();
  const [tradeState, setTradeState] = useState<TradeState | null>(null);
  const isTradeLocked = tradeState?.locked === true;

  useEffect(() => {
    const handleTradeState = (data: TradeState) => {
      if (data.locked) {
        setTradeState(data);
      } else {
        setTradeState(null);
      }
    };

    const handleDisconnect = () => {
      setTradeState(null);
    };

    on('game:trade_state', handleTradeState);
    on('disconnect', handleDisconnect);

    return () => {
      off('game:trade_state', handleTradeState);
      off('disconnect', handleDisconnect);
    };
  }, [on, off]);

  useEffect(() => {
    setTradeState(null);
  }, [player.roomId]);

  const initiateTrade = useCallback(() => {
    if (!player.roomId || !player.playerId) return;
    emit('game:initiate_trade', {
      roomId: player.roomId,
      playerId: player.playerId,
    });
  }, [player, emit]);

  const buyItem = useCallback((merchantId: string, merchantItemId: string, quantity = 1) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:buy_item', {
      roomId: player.roomId,
      playerId: player.playerId,
      merchantId,
      merchantItemId,
      quantity,
    });
  }, [player, emit]);

  const sellItem = useCallback((merchantId: string, itemId: string, quantity = 1) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:sell_item', {
      roomId: player.roomId,
      playerId: player.playerId,
      merchantId,
      itemId,
      quantity,
    });
  }, [player, emit]);

  const endTrade = useCallback(() => {
    if (!player.roomId || !player.playerId) return;
    emit('game:end_trade', {
      roomId: player.roomId,
      playerId: player.playerId,
    });
  }, [player, emit]);

  return (
    <TradeContext.Provider value={{
      tradeState, isTradeLocked, initiateTrade, buyItem, sellItem, endTrade,
    }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTradeContext() {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error('useTradeContext must be used within TradeProvider');
  return ctx;
}
