import { useState, useMemo } from 'react';
import { GameState } from '../types/game.types';

export function useGameState(gameState: GameState | null) {
  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[0] || null;
  }, [gameState]);

  const canAct = useMemo(() => {
    if (!gameState || !gameState.currentTurn) return true;
    return true;
  }, [gameState]);

  return {
    currentPlayer,
    canAct,
  };
}
