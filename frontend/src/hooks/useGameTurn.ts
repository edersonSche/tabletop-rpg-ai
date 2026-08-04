import { useMemo } from 'react';
import { TurnUpdate } from '../types/game.types';

interface UseGameTurnOptions {
  turnUpdate: TurnUpdate | null;
  playerId: string;
  isAiProcessing: boolean;
  isTradeLocked?: boolean;
}

export function useGameTurn({ turnUpdate, playerId, isAiProcessing, isTradeLocked = false }: UseGameTurnOptions) {
  const isMyTurn = useMemo(() => {
    if (!turnUpdate) return true;
    const { target, type } = turnUpdate;
    return target === playerId || type === 'group_action' || !type;
  }, [turnUpdate, playerId]);

  const isRollRequest = useMemo(() => {
    return turnUpdate?.type === 'call_roll' && turnUpdate?.target === playerId;
  }, [turnUpdate, playerId]);

  const isCallPhase = useMemo(() => {
    return turnUpdate?.type === 'call_player' || turnUpdate?.type === 'call_roll';
  }, [turnUpdate]);

  const actionsLocked = useMemo(() => {
    return isAiProcessing || isTradeLocked || isCallPhase;
  }, [isAiProcessing, isTradeLocked, isCallPhase]);

  const disabledReason = useMemo(() => {
    if (isAiProcessing) return 'AI is processing an action...';
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
    canAct,
    isMyTurn,
    isRollRequest,
    isCallPhase,
    actionsLocked,
    isInputDisabled,
    isRollDisabled,
    disabledReason,
  };
}
