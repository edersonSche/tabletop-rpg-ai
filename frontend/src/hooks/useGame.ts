import { useGameStore } from '../stores/gameStore';
import type { GameStateData } from '../stores/gameStore';

export function useGame<T>(selector: (state: GameStateData) => T): T {
  return useGameStore(selector);
}
