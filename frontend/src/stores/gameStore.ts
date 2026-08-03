import { create } from 'zustand';
import { on, off, emit } from './socket';
import { usePlayerStore } from './playerStore';
import { useAuthStore } from './authStore';
import { GameState, TurnUpdate, ConditionTickPayload, Message, GetStateResponse, NarrationResponse, ReconnectResponse } from '../types/game.types';

let lastHistoryLength = 0;

function processHistoryEntries(history: GameState['history'], players: GameState['players']): Message[] {
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
}

interface GameStateData {
  gameState: GameState | null;
  currentLocation: string | null;
  messages: Message[];
  turnUpdate: TurnUpdate | null;
  typingPlayers: Map<string, string>;
  isAiProcessing: boolean;
  applyGameState: (data: GameState) => void;
  sendAction: (message: string) => void;
  sendRoll: () => void;
  startCampaign: () => void;
  emitTyping: (username: string) => void;
  emitTypingStop: () => void;
  refetchGameState: () => void;
}

export type { GameStateData };

export const useGameStore = create<GameStateData>()((set, get) => ({
  gameState: null,
  currentLocation: null,
  messages: [],
  turnUpdate: null,
  typingPlayers: new Map(),
  isAiProcessing: false,

  applyGameState: (data: GameState) => {
    set({ gameState: data, currentLocation: data.currentLocation });
    if (data.gameStarted) useAuthStore.getState().dispatch({ type: 'CAMPAIGN_STARTED' });
    if (data.history) {
      const prevLength = lastHistoryLength;
      const newLength = data.history.length;

      if (newLength > prevLength) {
        const newEntries = data.history.slice(prevLength);
        const parsed = processHistoryEntries(newEntries, data.players);
        set((state) => ({ messages: [...state.messages, ...parsed] }));
      } else if (newLength < prevLength) {
        const parsed = processHistoryEntries(data.history, data.players);
        set({ messages: parsed });
      }

      lastHistoryLength = newLength;

      set({
        turnUpdate: {
          currentTurn: data.currentTurn,
          type: data.turnType,
          target: data.turnTarget,
          skill: data.turnSkill,
          dc: data.turnDc,
        },
      });
    }
  },

  sendAction: (message: string) => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:action', { roomId, playerId, message });
    set((state) => ({ messages: [...state.messages, { type: 'action', content: message, characterName: 'You', timestamp: Date.now() }] }));
  },

  sendRoll: () => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    const turnUpdate = get().turnUpdate;
    const skill = turnUpdate?.type === 'call_roll' ? turnUpdate.skill : undefined;
    const dc = turnUpdate?.type === 'call_roll' ? turnUpdate.dc : undefined;
    emit('game:roll', { roomId, playerId, skill, dc });
    set((state) => ({ messages: [...state.messages, { type: 'roll', content: 'Rolling dice...', characterName: 'You', timestamp: Date.now() }] }));
  },

  startCampaign: () => {
    const { roomId } = usePlayerStore.getState().player;
    if (!roomId) return;
    emit('game:start', { roomId });
  },

  emitTyping: (username: string) => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:typing', { roomId, playerId, username });
  },

  emitTypingStop: () => {
    const { roomId, playerId } = usePlayerStore.getState().player;
    if (!roomId || !playerId) return;
    emit('game:typing_stop', { roomId, playerId });
  },

  refetchGameState: () => {
    const { roomId } = usePlayerStore.getState().player;
    if (!roomId) return;
    emit('game:get_state', { roomId }, (response: GetStateResponse) => {
      if (response?.error === 'Room not found') {
        set({
          gameState: null,
          currentLocation: null,
          turnUpdate: null,
          messages: [{ type: 'system', content: 'Campaign is no longer available. Returning to lobby.', timestamp: Date.now() }],
        });
        useAuthStore.getState().dispatch({ type: 'LEFT_ROOM' });
      } else if (response) {
        get().applyGameState(response as GameState);
      }
    });
  },
}));

export function initGame(): () => void {
  const handleConnect = () => {
    useGameStore.setState({ isAiProcessing: false });
    const { roomId } = usePlayerStore.getState().player;
    if (roomId) {
      emit('game:reconnect', { roomId }, (response: ReconnectResponse) => {
        if (response && !response.success) {
          useGameStore.setState({
            gameState: null,
            currentLocation: null,
            turnUpdate: null,
            messages: [{ type: 'system', content: 'Campaign is no longer available. Returning to lobby.', timestamp: Date.now() }],
          });
          useAuthStore.getState().dispatch({ type: 'LEFT_ROOM' });
        }
      });
    }
  };

  const handleDisconnect = () => {
    useGameStore.setState({ gameState: null, currentLocation: null, turnUpdate: null, isAiProcessing: false });
  };

  const handleNarration = (data: NarrationResponse) => {
    useGameStore.setState((state) => ({ messages: [...state.messages, { type: 'narration', content: data.narration, timestamp: Date.now() }] }));
    lastHistoryLength = data.historyLength;
    const location = data.location;
    if (location !== undefined) {
      useGameStore.setState({ currentLocation: location });
    }
  };

  const handleTurn = (data: TurnUpdate) => {
    useGameStore.setState({ turnUpdate: data });
  };

  const handleMessage = (data: { type: 'system' | 'action'; content: string; characterName?: string }) => {
    useGameStore.setState((state) => ({ messages: [...state.messages, { ...data, timestamp: Date.now() }] }));
  };

  const handlePlayerAction = (data: { type: 'action' | 'roll'; playerId: string; characterName: string; message: string }) => {
    const name = data.playerId === usePlayerStore.getState().player.playerId ? 'You' : data.characterName;
    useGameStore.setState((state) => ({ messages: [...state.messages, { type: data.type, content: data.message, characterName: name, timestamp: Date.now() }] }));
  };

  const handleTyping = (data: { playerId: string; username: string }) => {
    useGameStore.setState((state) => {
      if (state.typingPlayers.get(data.playerId) === data.username) return state;
      return { typingPlayers: new Map(state.typingPlayers).set(data.playerId, data.username) };
    });
  };

  const handleTypingStop = (data: { playerId: string }) => {
    useGameStore.setState((state) => {
      if (!state.typingPlayers.has(data.playerId)) return state;
      const next = new Map(state.typingPlayers);
      next.delete(data.playerId);
      return { typingPlayers: next };
    });
  };

  const handleProcessing = (data: { processing: boolean }) => {
    useGameStore.setState({ isAiProcessing: data.processing });
  };

  const handleConditionTick = (data: ConditionTickPayload) => {
    useGameStore.setState((state) => {
      if (!state.gameState) return state;
      const updatedMap = new Map(data.players.map(p => [p.id, p]));
      return {
        gameState: {
          ...state.gameState,
          players: state.gameState.players.map(p => {
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
        },
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
      useGameStore.setState((state) => ({ messages: [...state.messages, ...newMessages] }));
    }
  };

  const handleLevelUp = (data: { playerId: string; newLevel: number; gainedPoints: number }) => {
    if (data.playerId === usePlayerStore.getState().player.playerId) {
      const msg = data.gainedPoints > 0
        ? `Level up! You reached level ${data.newLevel} and gained ${data.gainedPoints} attribute points to distribute!`
        : `Level up! You reached level ${data.newLevel}!`;
      useGameStore.setState((state) => ({ messages: [...state.messages, { type: 'system', content: msg, timestamp: Date.now() }] }));
    }
  };

  const handleAntidoteResult = (data: { success: boolean; conditionRemoved?: string }) => {
    if (data.success && data.conditionRemoved) {
      useGameStore.setState((state) => ({
        messages: [...state.messages, { type: 'system', content: `Antidote cured: ${data.conditionRemoved}`, timestamp: Date.now() }],
      }));
    }
  };

  const handleDisband = () => {
    useGameStore.setState({ gameState: null, currentLocation: null, turnUpdate: null, messages: [], isAiProcessing: false });
  };

  const unsubscribeRoom = usePlayerStore.subscribe((state, prevState) => {
    const prev = prevState.player.roomId;
    const next = state.player.roomId;
    if (prev && prev !== next) {
      lastHistoryLength = 0;
      useGameStore.setState({ gameState: null, currentLocation: null, turnUpdate: null, messages: [], typingPlayers: new Map(), isAiProcessing: false });
    }
  });

  on('connect', handleConnect);
  on('disconnect', handleDisconnect);
  on('game:state', useGameStore.getState().applyGameState);
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
    unsubscribeRoom();
    off('connect', handleConnect);
    off('disconnect', handleDisconnect);
    off('game:state', useGameStore.getState().applyGameState);
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
}
