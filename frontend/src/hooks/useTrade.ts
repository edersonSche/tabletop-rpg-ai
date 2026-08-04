import { useTradeStore } from '../stores/tradeStore';
import type { TradeStateData } from '../stores/tradeStore';

export function useTrade<T>(selector: (state: TradeStateData) => T): T {
  return useTradeStore(selector);
}
