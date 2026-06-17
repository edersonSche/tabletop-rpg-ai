import { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../types/game.types';
import { Page, pageReducer } from '../routing/pageRouter';

interface PlayerInfo {
  playerId: string;
  roomId: string | null;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  page: Page;
  player: PlayerInfo;
  gameState: GameState | null;
  narrations: Array<{ narration: string; timestamp: number }>;
  messages: Array<{ type: 'system' | 'action' | 'narration'; content: string; playerName?: string; timestamp: number }>;
  turnUpdate: { currentTurn: string | null; type: string | null; target: string | null } | null;
  error: string | null;
  typingPlayers: Map<string, string>;
  isAiProcessing: boolean;
  createRoom: (name: string, playerName: string, language?: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  joinGameRoom: (roomId: string, playerName: string) => void;
  sendAction: (message: string) => void;
  sendRoll: () => void;
  startCampaign: () => void;
  emitTyping: (username: string) => void;
  emitTypingStop: () => void;
  listRooms: () => Promise<any[]>;
  leaveRoom: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo>({ playerId: '', roomId: null });
  const playerRef = useRef(player);
  playerRef.current = player;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [page, dispatch] = useReducer(pageReducer, 'lobby');
  const [narrations, setNarrations] = useState<Array<{ narration: string; timestamp: number }>>([]);
  const [turnUpdate, setTurnUpdate] = useState<{ currentTurn: string | null; type: string | null; target: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typingPlayers, setTypingPlayers] = useState<Map<string, string>>(new Map());
  const [messages, setMessages] = useState<Array<{ type: 'system' | 'action' | 'narration'; content: string; playerName?: string; timestamp: number }>>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setConnected(true);
      const currentRoomId = playerRef.current.roomId;
      if (currentRoomId) {
        s.emit('game:get_state', { roomId: currentRoomId }, (response: any) => {
          if (response?.error === 'Room not found') {
            setPlayer({ playerId: '', roomId: null });
            setGameState(null);
            setNarrations([]);
            setTurnUpdate(null);
            setMessages([{ type: 'system', content: 'Campanha não está mais disponível. Voltando ao lobby.', timestamp: Date.now() }]);
            dispatch({ type: 'LEFT_ROOM' });
          }
        });
      }
    });
    s.on('disconnect', () => {
      setConnected(false);
      if (playerRef.current.roomId) {
        disconnectTimerRef.current = setTimeout(() => {
          setPlayer({ playerId: '', roomId: null });
          setGameState(null);
          setNarrations([]);
          setTurnUpdate(null);
          setMessages([{ type: 'system', content: 'Conexão perdida. Voltando ao lobby.', timestamp: Date.now() }]);
          dispatch({ type: 'DISBANDED' });
          disconnectTimerRef.current = null;
        }, 10000);
      }
    });

    s.on('player:registered', (data: { playerId: string }) => {
      setPlayer(prev => ({ ...prev, playerId: data.playerId }));
    });

    s.on('game:state', (data: GameState) => {
      setGameState(data);
      if (data.scene) dispatch({ type: 'CAMPAIGN_STARTED' });
      if (data.history) {
        const playerMap = new Map((data.players || []).map(p => [p.id, p.name]));
        const newMessages: Array<{ type: 'system' | 'action' | 'narration'; content: string; playerName?: string; timestamp: number }> = [];
        const newNarrations: Array<{ narration: string; timestamp: number }> = [];

        for (const entry of data.history) {
          if (entry.role === 'player') {
            newMessages.push({
              type: 'action',
              content: entry.content,
              playerName: playerMap.get(entry.playerId || '') || 'Unknown',
              timestamp: Date.now(),
            });
          } else if (entry.role === 'assistant') {
            try {
              const aiResponse = JSON.parse(entry.content);
              if (aiResponse.narration) {
                newMessages.push({ type: 'narration', content: aiResponse.narration, timestamp: Date.now() });
                newNarrations.push({ narration: aiResponse.narration, timestamp: Date.now() });
              }
            } catch {}
          } else if (entry.role === 'system') {
            newMessages.push({ type: 'system', content: entry.content, timestamp: Date.now() });
          }
        }

        setMessages(newMessages);
        setNarrations(newNarrations);
        setTurnUpdate({
          currentTurn: data.currentTurn,
          type: data.turnType,
          target: data.turnTarget,
        });
      }
    });

    s.on('game:narration', (data: { narration: string; next: { type: string; target?: string }; state: GameState }) => {
      setNarrations(prev => [...prev, { narration: data.narration, timestamp: Date.now() }]);
      setMessages(prev => [...prev, { type: 'narration', content: data.narration, timestamp: Date.now() }]);
      if (data.state) {
        setGameState(data.state);
        if (data.state.scene) dispatch({ type: 'CAMPAIGN_STARTED' });
      }
    });

    s.on('game:turn', (data: { currentTurn: string | null; type: string | null; target: string | null }) => {
      setTurnUpdate(data);
    });

    s.on('game:message', (data: { type: 'system' | 'action'; content: string; playerName?: string }) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
    });

    s.on('game:error', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    s.on('game:typing', (data: { playerId: string; username: string }) => {
      setTypingPlayers(prev => new Map(prev).set(data.playerId, data.username));
    });

    s.on('game:typing_stop', (data: { playerId: string }) => {
      setTypingPlayers(prev => {
        const next = new Map(prev);
        next.delete(data.playerId);
        return next;
      });
    });

    s.on('game:processing', (data: { processing: boolean }) => {
      setIsAiProcessing(data.processing);
    });

    s.on('game:disband', (data: { reason: string }) => {
      setPlayer({ playerId: '', roomId: null });
      setGameState(null);
      setNarrations([]);
      setMessages([]);
      setTurnUpdate(null);
      setError(data.reason);
      dispatch({ type: 'DISBANDED' });
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      s.disconnect();
    };
  }, []);

  const createRoom = useCallback((name: string, playerName: string, language?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('lobby:create', { name, playerName, language }, (response: any) => {
      if (response.success) {
        setPlayer(prev => ({ ...prev, roomId: response.room.id, playerId: response.playerId }));
        dispatch({ type: 'JOINED_ROOM' });
      }
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('lobby:join', { roomId, playerName }, (response: any) => {
      if (response.success) {
        setPlayer(prev => ({ ...prev, roomId: response.room.id, playerId: response.playerId }));
        dispatch({ type: 'JOINED_ROOM' });
      } else {
        setError(response.error);
      }
    });
  }, []);

  const joinGameRoom = useCallback((roomId: string, playerName: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:join', { roomId, playerName }, (response: any) => {
      if (response.success) {
        setPlayer(prev => ({ ...prev, roomId, playerId: response.playerId }));
        dispatch({ type: 'JOINED_ROOM' });
      } else {
        setError(response.error);
      }
    });
  }, []);

  const sendAction = useCallback((message: string) => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    socketRef.current.emit('game:action', { roomId: player.roomId, playerId: player.playerId, message });
    setMessages(prev => [...prev, { type: 'action', content: message, playerName: 'You', timestamp: Date.now() }]);
  }, [player]);

  const sendRoll = useCallback(() => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    socketRef.current.emit('game:roll', { roomId: player.roomId, playerId: player.playerId });
  }, [player]);

  const startCampaign = useCallback(() => {
    if (!socketRef.current || !player.roomId) return;
    socketRef.current.emit('game:start', { roomId: player.roomId });
  }, [player]);

  const emitTyping = useCallback((username: string) => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    socketRef.current.emit('game:typing', { roomId: player.roomId, playerId: player.playerId, username });
  }, [player]);

  const emitTypingStop = useCallback(() => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    socketRef.current.emit('game:typing_stop', { roomId: player.roomId, playerId: player.playerId });
  }, [player]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    socketRef.current.emit('room:leave', { roomId: player.roomId, playerId: player.playerId }, (response: any) => {
      if (response.success) {
        setPlayer({ playerId: '', roomId: null });
        setGameState(null);
        setNarrations([]);
        setMessages([]);
        setTurnUpdate(null);
        dispatch({ type: 'LEFT_ROOM' });
      }
    });
  }, [player]);

  const listRooms = useCallback((): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve([]);
      socketRef.current.emit('lobby:list', (response: any) => resolve(response || []));
    });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket, connected, page, player, gameState, narrations, messages,
        turnUpdate, error, typingPlayers, isAiProcessing,
        createRoom, joinRoom, joinGameRoom, sendAction, sendRoll,
        startCampaign, emitTyping, emitTypingStop, listRooms, leaveRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
