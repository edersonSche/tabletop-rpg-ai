import { useMemo } from 'react';
import { GameState, TurnUpdate } from '../types/game.types';

interface UseGameTurnOptions {
  gameState: GameState | null;
  turnUpdate: TurnUpdate | null;
  playerId: string;
  isAiProcessing: boolean;
  isTradeLocked?: boolean;
}

export function useGameTurn({ gameState, turnUpdate, playerId, isAiProcessing, isTradeLocked = false }: UseGameTurnOptions) {
  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    const targetId = turnUpdate?.target || gameState.currentTurn;
    if (!targetId) return null;
    if (turnUpdate?.type === 'group_action') return null;
    return gameState.players.find(p => p.id === targetId) || null;
  }, [gameState, turnUpdate]);

  const isMyTurn = useMemo(() => {
    if (!turnUpdate) return true;
    const { target, type } = turnUpdate;
    return target === playerId || type === 'group_action' || !type;
  }, [turnUpdate, playerId]);

  const isRollRequest = useMemo(() => {
    return turnUpdate?.type === 'call_roll' && turnUpdate?.target === playerId;
  }, [turnUpdate, playerId]);

  const disabledReason = useMemo(() => {
    if (isTradeLocked) return 'Trade in progress';
    if (!isMyTurn) return 'Not your turn';
    return undefined;
  }, [isMyTurn, isAiProcessing, isTradeLocked]);

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
