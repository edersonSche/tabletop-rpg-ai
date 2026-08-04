import { usePlayerStore } from '../stores/playerStore';
import type { PlayerState } from '../stores/playerStore';

export function usePlayer<T>(selector: (state: PlayerState) => T): T {
  return usePlayerStore(selector);
}
