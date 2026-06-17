import { useMemo } from 'react';
import { GameState, TurnUpdate } from '../types/game.types';

interface UseGameTurnOptions {
  gameState: GameState | null;
  turnUpdate: TurnUpdate | null;
  playerId: string;
  isAiProcessing: boolean;
}

export function useGameTurn({ gameState, turnUpdate, playerId, isAiProcessing }: UseGameTurnOptions) {
  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[0] || null;
  }, [gameState]);

  const isMyTurn = useMemo(() => {
    if (!turnUpdate) return true;
    const { target, type } = turnUpdate;
    return target === playerId || type === 'group_action' || !type;
  }, [turnUpdate, playerId]);

  const isRollRequest = useMemo(() => {
    return turnUpdate?.type === 'call_roll' && turnUpdate?.target === playerId;
  }, [turnUpdate, playerId]);

  const disabledReason = useMemo(() => {
    if (!isMyTurn) return 'Not your turn';
    if (isAiProcessing) return 'AI is processing...';
    return undefined;
  }, [isMyTurn, isAiProcessing]);

  const isInputDisabled = useMemo(() => {
    return !!disabledReason || isRollRequest;
  }, [disabledReason, isRollRequest]);

  const isRollDisabled = useMemo(() => {
    return !!disabledReason;
  }, [disabledReason]);

  const canAct = useMemo(() => {
    return isMyTurn && !isAiProcessing;
  }, [isMyTurn, isAiProcessing]);

  return {
    currentPlayer,
    canAct,
    isMyTurn,
    isRollRequest,
    isInputDisabled,
    isRollDisabled,
    disabledReason,
  };
}
