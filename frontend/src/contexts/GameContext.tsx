import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSocketContext } from './SocketContext';
import { usePlayerContext } from './PlayerContext';
import { useAuthContext } from './AuthContext';
import { GameState, TurnUpdate, ConditionTickPayload, Message, GetStateResponse } from '../types/game.types';

interface GameContextValue {
  gameState: GameState | null;
  messages: Message[];
  turnUpdate: TurnUpdate | null;
  typingPlayers: Map<string, string>;
  isAiProcessing: boolean;
  sendAction: (message: string) => void;
  sendRoll: () => void;
  startCampaign: () => void;
  emitTyping: (username: string) => void;
  emitTypingStop: () => void;
  refetchGameState: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { on, off, emit } = useSocketContext();
  const { player } = usePlayerContext();
  const { dispatch } = useAuthContext();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [turnUpdate, setTurnUpdate] = useState<TurnUpdate | null>(null);
  const [typingPlayers, setTypingPlayers] = useState<Map<string, string>>(new Map());
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const playerRef = useRef(player);
  playerRef.current = player;
  const lastHistoryLengthRef = useRef(0);
  const prevRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setIsAiProcessing(false);
      const currentRoomId = playerRef.current.roomId;
      if (currentRoomId) {
        emit('game:get_state', { roomId: currentRoomId }, (response: GetStateResponse) => {
          if (response?.error === 'Room not found') {
            setGameState(null);
            setTurnUpdate(null);
            setMessages([{ type: 'system', content: 'Campaign is no longer available. Returning to lobby.', timestamp: Date.now() }]);
            dispatch({ type: 'LEFT_ROOM' });
          }
        });
      }
    };

    const handleDisconnect = () => {
      setGameState(null);
      setTurnUpdate(null);
      setIsAiProcessing(false);
    };

    const processHistoryEntries = (history: GameState['history'], players: GameState['players']): Message[] => {
      const playerMap = new Map((players || []).map(p => [p.id, p.name]));
      const result: Message[] = [];

      for (const entry of history) {
        if (entry.role === 'player') {
          result.push({
            type: 'action',
            content: entry.content,
            characterName: playerMap.get(entry.playerId || '') || 'Unknown',
            timestamp: Date.now(),
          });
        } else if (entry.role === 'assistant') {
          let narration = entry.content;
          try {
            const parsed = JSON.parse(entry.content);
            if (parsed.narration) narration = parsed.narration;
          } catch {}
          if (narration) {
            result.push({ type: 'narration', content: narration, timestamp: Date.now() });
          }
        } else if (entry.role === 'system') {
          result.push({ type: 'system', content: entry.content, timestamp: Date.now() });
        }
      }

      return result;
    };

    const handleGameState = (data: GameState) => {
      setGameState(data);
      if (data.gameStarted) dispatch({ type: 'CAMPAIGN_STARTED' });
      if (data.history) {
        const prevLength = lastHistoryLengthRef.current;
        const newLength = data.history.length;

        if (newLength > prevLength) {
          const newEntries = data.history.slice(prevLength);
          const parsed = processHistoryEntries(newEntries, data.players);
          setMessages(prev => [...prev, ...parsed]);
        } else if (newLength < prevLength) {
          const parsed = processHistoryEntries(data.history, data.players);
          setMessages(parsed);
        }

        lastHistoryLengthRef.current = newLength;

        setTurnUpdate({
          currentTurn: data.currentTurn,
          type: data.turnType,
          target: data.turnTarget,
        });
      }
    };

    const handleNarration = (data: { narration: string; next: { type: string; target?: string }; state: GameState }) => {
      setMessages(prev => [...prev, { type: 'narration', content: data.narration, timestamp: Date.now() }]);
      if (data.state) {
        setGameState(data.state);
        if (data.state.gameStarted) dispatch({ type: 'CAMPAIGN_STARTED' });
      }
    };

    const handleTurn = (data: TurnUpdate) => {
      setTurnUpdate(data);
    };

    const handleMessage = (data: { type: 'system' | 'action'; content: string; characterName?: string }) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
    };

    const handlePlayerAction = (data: { type: 'action' | 'roll'; playerId: string; characterName: string; message: string }) => {
      const name = data.playerId === playerRef.current.playerId ? 'You' : data.characterName;
      setMessages(prev => [...prev, { type: data.type, content: data.message, characterName: name, timestamp: Date.now() }]);
    };

    const handleTyping = (data: { playerId: string; username: string }) => {
      setTypingPlayers(prev => new Map(prev).set(data.playerId, data.username));
    };

    const handleTypingStop = (data: { playerId: string }) => {
      setTypingPlayers(prev => {
        const next = new Map(prev);
        next.delete(data.playerId);
        return next;
      });
    };

    const handleProcessing = (data: { processing: boolean }) => {
      setIsAiProcessing(data.processing);
    };

    const handleConditionTick = (data: ConditionTickPayload) => {
      setGameState(prev => {
        if (!prev) return prev;
        const updatedMap = new Map(data.players.map(p => [p.id, p]));
        return {
          ...prev,
          players: prev.players.map(p => {
            const updated = updatedMap.get(p.id);
            if (!updated) return p;
            return {
              ...p,
              hp: updated.hp,
              maxHp: updated.maxHp,
              ac: updated.ac,
              activeConditions: updated.activeConditions,
            };
          }),
        };
      });

      const newMessages: Message[] = [];
      for (const p of data.players) {
        const tr = p.tickResult;
        if (tr.hpChange < 0) {
          newMessages.push({ type: 'system', content: `${p.tickResult.playerName || 'Unknown'} took ${Math.abs(tr.hpChange)} damage.`, timestamp: Date.now() });
        } else if (tr.hpChange > 0) {
          newMessages.push({ type: 'system', content: `${p.tickResult.playerName || 'Unknown'} healed ${tr.hpChange} HP.`, timestamp: Date.now() });
        }
        for (const name of tr.conditionsExpired) {
          newMessages.push({ type: 'system', content: `${name} has ended.`, timestamp: Date.now() });
        }
        for (const dot of tr.dotDetails) {
          const typeLabel = dot.type === 'damage' ? 'damage' : 'healing';
          newMessages.push({ type: 'system', content: `${p.tickResult.playerName || 'Unknown'} received ${typeLabel} from ${dot.conditionName} (${dot.formula}).`, timestamp: Date.now() });
        }
      }
      if (newMessages.length > 0) {
        setMessages(prev => [...prev, ...newMessages]);
      }
    };

    const handleLevelUp = (data: { playerId: string; newLevel: number; gainedPoints: number }) => {
      if (data.playerId === playerRef.current.playerId) {
        const msg = data.gainedPoints > 0
          ? `Level up! You reached level ${data.newLevel} and gained ${data.gainedPoints} attribute points to distribute!`
          : `Level up! You reached level ${data.newLevel}!`;
        setMessages(prev => [...prev, { type: 'system', content: msg, timestamp: Date.now() }]);
      }
    };

    const handleAntidoteResult = (data: { success: boolean; conditionRemoved?: string }) => {
      if (data.success && data.conditionRemoved) {
        setMessages(prev => [...prev, {
          type: 'system',
          content: `Antidote cured: ${data.conditionRemoved}`,
          timestamp: Date.now(),
        }]);
      }
    };

    const handleDisband = () => {
      setGameState(null);
      setTurnUpdate(null);
      setMessages([]);
      setIsAiProcessing(false);
    };

    on('connect', handleConnect);
    on('disconnect', handleDisconnect);
    on('game:state', handleGameState);
    on('game:narration', handleNarration);
    on('game:turn', handleTurn);
    on('game:message', handleMessage);
    on('game:player_action', handlePlayerAction);
    on('game:typing', handleTyping);
    on('game:typing_stop', handleTypingStop);
    on('game:processing', handleProcessing);
    on('game:condition_tick', handleConditionTick);
    on('game:level_up', handleLevelUp);
    on('game:antidote_result', handleAntidoteResult);
    on('game:disband', handleDisband);

    return () => {
      off('connect', handleConnect);
      off('disconnect', handleDisconnect);
      off('game:state', handleGameState);
      off('game:narration', handleNarration);
      off('game:turn', handleTurn);
      off('game:message', handleMessage);
      off('game:player_action', handlePlayerAction);
      off('game:typing', handleTyping);
      off('game:typing_stop', handleTypingStop);
      off('game:processing', handleProcessing);
      off('game:condition_tick', handleConditionTick);
      off('game:level_up', handleLevelUp);
      off('game:antidote_result', handleAntidoteResult);
      off('game:disband', handleDisband);
    };
  }, [on, off, emit, dispatch]);

  useEffect(() => {
    const prev = prevRoomIdRef.current;
    prevRoomIdRef.current = player.roomId;
    if (prev && prev !== player.roomId) {
      setGameState(null);
      setTurnUpdate(null);
      setMessages([]);
      setTypingPlayers(new Map());
      setIsAiProcessing(false);
      lastHistoryLengthRef.current = 0;
    }
  }, [player.roomId]);

  const sendAction = useCallback((message: string) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:action', { roomId: player.roomId, playerId: player.playerId, message });
    setMessages(prev => [...prev, { type: 'action', content: message, characterName: 'You', timestamp: Date.now() }]);
  }, [player, emit]);

  const sendRoll = useCallback(() => {
    if (!player.roomId || !player.playerId) return;
    const skill = turnUpdate?.type === 'call_roll' ? turnUpdate.skill : undefined;
    const dc = turnUpdate?.type === 'call_roll' ? turnUpdate.dc : undefined;
    emit('game:roll', { roomId: player.roomId, playerId: player.playerId, skill, dc });
    setMessages(prev => [...prev, { type: 'roll', content: 'Rolling dice...', characterName: 'You', timestamp: Date.now() }]);
  }, [player, turnUpdate, emit]);

  const startCampaign = useCallback(() => {
    if (!player.roomId) return;
    emit('game:start', { roomId: player.roomId });
  }, [player, emit]);

  const emitTyping = useCallback((username: string) => {
    if (!player.roomId || !player.playerId) return;
    emit('game:typing', { roomId: player.roomId, playerId: player.playerId, username });
  }, [player, emit]);

  const emitTypingStop = useCallback(() => {
    if (!player.roomId || !player.playerId) return;
    emit('game:typing_stop', { roomId: player.roomId, playerId: player.playerId });
  }, [player, emit]);

  const refetchGameState = useCallback(() => {
    if (!player.roomId) return;
    emit('game:get_state', { roomId: player.roomId }, (response: GetStateResponse) => {
      if (response?.error === 'Room not found') {
        setGameState(null);
        setTurnUpdate(null);
        setMessages([{ type: 'system', content: 'Campaign is no longer available. Returning to lobby.', timestamp: Date.now() }]);
        dispatch({ type: 'LEFT_ROOM' });
      }
    });
  }, [player.roomId, emit, dispatch]);

  return (
    <GameContext.Provider value={{
      gameState, messages, turnUpdate, typingPlayers, isAiProcessing,
      sendAction, sendRoll, startCampaign, emitTyping, emitTypingStop,
      refetchGameState,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
