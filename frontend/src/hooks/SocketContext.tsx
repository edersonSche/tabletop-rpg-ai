import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../types/game.types';

interface PlayerInfo {
  playerId: string;
  roomId: string | null;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
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
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo>({ playerId: '', roomId: null });
  const [gameState, setGameState] = useState<GameState | null>(null);
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

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('player:registered', (data: { playerId: string }) => {
      setPlayer(prev => ({ ...prev, playerId: data.playerId }));
    });

    s.on('game:state', (data: GameState) => {
      setGameState(data);
    });

    s.on('game:narration', (data: { narration: string; next: { type: string; target?: string }; state: GameState }) => {
      setNarrations(prev => [...prev, { narration: data.narration, timestamp: Date.now() }]);
      setMessages(prev => [...prev, { type: 'narration', content: data.narration, timestamp: Date.now() }]);
      if (data.state) setGameState(data.state);
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

    socketRef.current = s;
    setSocket(s);

    return () => { s.disconnect(); };
  }, []);

  const createRoom = useCallback((name: string, playerName: string, language?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('lobby:create', { name, playerName, language }, (response: any) => {
      if (response.success) {
        setPlayer(prev => ({ ...prev, roomId: response.room.id, playerId: response.playerId }));
      }
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('lobby:join', { roomId, playerName }, (response: any) => {
      if (response.success) {
        setPlayer(prev => ({ ...prev, roomId: response.room.id, playerId: response.playerId }));
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

  const listRooms = useCallback((): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve([]);
      socketRef.current.emit('lobby:list', (response: any) => resolve(response || []));
    });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket, connected, player, gameState, narrations, messages,
        turnUpdate, error, typingPlayers, isAiProcessing,
        createRoom, joinRoom, joinGameRoom, sendAction, sendRoll,
        startCampaign, emitTyping, emitTypingStop, listRooms,
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
