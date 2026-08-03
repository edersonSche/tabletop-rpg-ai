import { create } from 'zustand';
import { on, off, emit } from './socket';
import { usePlayerStore } from './playerStore';
import { TradeState } from '../types/game.types';

interface TradeStateData {
  tradeState: TradeState | null;
  isTradeLocked: boolean;
  initiateTrade: () => void;
  buyItem: (merchantId: string, merchantItemId: string, quantity?: number) => void;
  sellItem: (merchantId: string, itemId: string, quantity?: number) => void;
  endTrade: () => void;
}

export type { TradeStateData };

export const useTradeStore = create<TradeStateData>()((set) => ({
  tradeState: null,
  isTradeLocked: false,

  initiateTrade: () => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:initiate_trade', { roomId, playerId });
  },

  buyItem: (merchantId: string, merchantItemId: string, quantity = 1) => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:buy_item', { roomId, playerId, merchantId, merchantItemId, quantity });
  },

  sellItem: (merchantId: string, itemId: string, quantity = 1) => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:sell_item', { roomId, playerId, merchantId, itemId, quantity });
  },

  endTrade: () => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:end_trade', { roomId, playerId });
  },
}));

export function initTrade(): () => void {
  const handleTradeState = (data: TradeState) => {
    useTradeStore.setState(data.locked ? { tradeState: data, isTradeLocked: true } : { tradeState: null, isTradeLocked: false });
  };

  const handleDisconnect = () => {
    useTradeStore.setState({ tradeState: null, isTradeLocked: false });
  };

  const unsubscribeRoom = usePlayerStore.subscribe((state, prevState) => {
    if (state.player.roomId !== prevState.player.roomId) {
      useTradeStore.setState({ tradeState: null, isTradeLocked: false });
    }
  });

  on('game:trade_state', handleTradeState);
  on('disconnect', handleDisconnect);

  return () => {
    unsubscribeRoom();
    off('game:trade_state', handleTradeState);
    off('disconnect', handleDisconnect);
  };
}
