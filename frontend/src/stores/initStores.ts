import { initSocket } from './socket';
import { initAuth } from './authStore';
import { initPlayer } from './playerStore';
import { initGame } from './gameStore';
import { initTrade } from './tradeStore';

export function initStores(): () => void {
  const cleanups = [
    initSocket(),
    initAuth(),
    initPlayer(),
    initGame(),
    initTrade(),
  ];
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
