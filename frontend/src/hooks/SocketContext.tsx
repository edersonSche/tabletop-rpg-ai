import { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, TurnUpdate, Player, SavedCampaignInfo } from '../types/game.types';
import { Page, pageReducer } from '../routing/pageRouter';

interface PlayerInfo {
  playerId: string;
  roomId: string | null;
}

interface MessageEntry {
  type: 'system' | 'action' | 'narration' | 'roll';
  content: string;
  characterName?: string;
  timestamp: number;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  page: Page;
  userId: string | null;
  player: PlayerInfo;
  gameState: GameState | null;
  messages: MessageEntry[];
  turnUpdate: TurnUpdate | null;
  error: string | null;
  setError: (error: string | null) => void;
  typingPlayers: Map<string, string>;
  isAiProcessing: boolean;
  login: (userId: string) => Promise<boolean>;
  createRoom: (name: string, language?: string, campaignTheme?: string) => Promise<void>;
  createCharacter: (roomId: string, name: string, attributes?: Player['attributes']) => Promise<void>;
  createCharacterOnJoin: (roomId: string, name: string) => void;
  joinRoom: (roomId: string) => Promise<void>;
  joinGameRoom: (roomId: string) => void;
  sendAction: (message: string) => void;
  sendRoll: () => void;
  startCampaign: () => void;
  emitTyping: (username: string) => void;
  emitTypingStop: () => void;
  listRooms: () => Promise<any[]>;
  listSavedCampaigns: () => Promise<SavedCampaignInfo[]>;
  resumeCampaign: (campaignId: string) => Promise<void>;
  deleteSavedCampaign: (campaignId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [player, setPlayer] = useState<PlayerInfo>({ playerId: '', roomId: null });
  const playerRef = useRef(player);
  playerRef.current = player;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [page, dispatch] = useReducer(pageReducer, 'login');
  const [turnUpdate, setTurnUpdate] = useState<TurnUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typingPlayers, setTypingPlayers] = useState<Map<string, string>>(new Map());
  const [messages, setMessages] = useState<MessageEntry[]>([]);
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

      const currentUserId = userIdRef.current;
      if (currentUserId) {
        s.emit('auth:login', { userId: currentUserId }, (response: any) => {
          if (!response.success) {
            setUserId(null);
            dispatch({ type: 'LOGGED_OUT' });
          }
        });
      }

      const currentRoomId = playerRef.current.roomId;
      if (currentRoomId) {
        s.emit('game:get_state', { roomId: currentRoomId }, (response: any) => {
          if (response?.error === 'Room not found') {
            setPlayer({ playerId: '', roomId: null });
            setGameState(null);
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
          setUserId(null);
          setPlayer({ playerId: '', roomId: null });
          setGameState(null);
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
      if (data.gameStarted) dispatch({ type: 'CAMPAIGN_STARTED' });
      if (data.history) {
        const playerMap = new Map((data.players || []).map(p => [p.id, p.name]));
        const newMessages: MessageEntry[] = [];

        for (const entry of data.history) {
          if (entry.role === 'player') {
            newMessages.push({
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
              newMessages.push({ type: 'narration', content: narration, timestamp: Date.now() });
            }
          } else if (entry.role === 'system') {
            newMessages.push({ type: 'system', content: entry.content, timestamp: Date.now() });
          }
        }

        setMessages(newMessages);
        setTurnUpdate({
          currentTurn: data.currentTurn,
          type: data.turnType,
          target: data.turnTarget,
        });
      }
    });

    s.on('game:narration', (data: { narration: string; next: { type: string; target?: string }; state: GameState }) => {
      setMessages(prev => [...prev, { type: 'narration', content: data.narration, timestamp: Date.now() }]);
      if (data.state) {
        setGameState(data.state);
        if (data.state.gameStarted) dispatch({ type: 'CAMPAIGN_STARTED' });
      }
    });

    s.on('game:turn', (data: TurnUpdate) => {
      setTurnUpdate(data);
    });

    s.on('game:message', (data: { type: 'system' | 'action'; content: string; characterName?: string }) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
    });

    s.on('game:player_action', (data: { type: 'action' | 'roll'; playerId: string; characterName: string; message: string }) => {
      const name = data.playerId === playerRef.current.playerId ? 'You' : data.characterName;
      setMessages(prev => [...prev, { type: data.type, content: data.message, characterName: name, timestamp: Date.now() }]);
    });

    s.on('game:error', (data: { message: string }) => {
      if (data.message === 'Authentication required' && userIdRef.current) {
        setUserId(null);
        dispatch({ type: 'LOGGED_OUT' });
        return;
      }
      setError(data.message);
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

  const createRoom = useCallback((name: string, language?: string, campaignTheme?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) { reject(new Error('No socket')); return; }
      socketRef.current.emit('lobby:create', { name, language, campaignTheme }, (response: any) => {
        if (response.success) {
          setPlayer(prev => ({ ...prev, roomId: response.room.id }));
          dispatch({ type: 'CREATED_ROOM' });
          resolve();
        } else {
          setError(response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const createCharacter = useCallback((roomId: string, name: string, attributes?: Player['attributes']): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) { reject(new Error('No socket')); return; }
      socketRef.current.emit('lobby:create_character', { roomId, name, attributes }, (response: any) => {
        if (response.success) {
          setPlayer(prev => ({ ...prev, playerId: response.playerId }));
          if (response.campaignStarted) {
            dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
          } else {
            dispatch({ type: 'CHARACTER_CREATED' });
          }
          resolve();
        } else {
          setError(response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const createCharacterOnJoin = useCallback((roomId: string, name: string) => {
    createCharacter(roomId, name);
  }, [createCharacter]);

  const joinRoom = useCallback((roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) { reject(new Error('No socket')); return; }
      socketRef.current.emit('lobby:join', { roomId }, (response: any) => {
        if (response.success) {
          if (response.needsCharacter) {
            setPlayer(prev => ({ ...prev, roomId }));
            dispatch({ type: 'JOIN_NEEDS_CHARACTER' });
          } else {
            setPlayer(prev => ({ ...prev, roomId: response.room.id, playerId: response.playerId }));
            if (response.campaignStarted) {
              dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
            } else {
              dispatch({ type: 'JOINED_ROOM' });
            }
          }
          resolve();
        } else {
          setError(response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const joinGameRoom = useCallback((roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:join', { roomId }, (response: any) => {
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
    setMessages(prev => [...prev, { type: 'action', content: message, characterName: 'You', timestamp: Date.now() }]);
  }, [player]);

  const sendRoll = useCallback(() => {
    if (!socketRef.current || !player.roomId || !player.playerId) return;
    const skill = turnUpdate?.type === 'call_roll' ? turnUpdate.skill : undefined;
    const dc = turnUpdate?.type === 'call_roll' ? turnUpdate.dc : undefined;
    socketRef.current.emit('game:roll', { roomId: player.roomId, playerId: player.playerId, skill, dc });
    setMessages(prev => [...prev, { type: 'roll', content: 'Rolando dados...', characterName: 'You', timestamp: Date.now() }]);
  }, [player, turnUpdate]);

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

  const leaveRoom = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !player.roomId || !player.playerId) { reject(new Error('Not connected')); return; }
      socketRef.current.emit('room:leave', { roomId: player.roomId, playerId: player.playerId }, (response: any) => {
        if (response.success) {
          setPlayer({ playerId: '', roomId: null });
          setGameState(null);
          setMessages([]);
          setTurnUpdate(null);
          dispatch({ type: 'LEFT_ROOM' });
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to leave'));
        }
      });
    });
  }, [player]);

  const login = useCallback((userId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);
      socketRef.current.emit('auth:login', { userId }, (response: any) => {
        if (response.success) {
          setUserId(userId);
          dispatch({ type: 'LOGGED_IN' });
          resolve(true);
        } else {
          setError(response.error);
          resolve(false);
        }
      });
    });
  }, []);

  const listRooms = useCallback((): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve([]);
      socketRef.current.emit('lobby:list', (response: any) => resolve(response || []));
    });
  }, []);

  const listSavedCampaigns = useCallback((): Promise<SavedCampaignInfo[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve([]);
      socketRef.current.emit('lobby:list_saved', (response: any) => resolve(response?.campaigns || []));
    });
  }, []);

  const resumeCampaign = useCallback((campaignId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) { reject(new Error('No socket')); return; }
      socketRef.current.emit('lobby:resume', { campaignId }, (response: any) => {
        if (response.success) {
          setPlayer(prev => ({
            ...prev,
            roomId: response.room.id,
            playerId: response.playerId,
          }));
          if (response.campaignStarted) {
            dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
          } else {
            dispatch({ type: 'RESUMED_CAMPAIGN' });
          }
          resolve();
        } else {
          setError(response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const deleteSavedCampaign = useCallback((campaignId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);
      socketRef.current.emit('lobby:delete_saved', { campaignId }, (response: any) => {
        if (response.success) {
          resolve(true);
        } else {
          setError(response.error);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket, connected, page, userId, player, gameState, messages,
        turnUpdate, error, setError, typingPlayers, isAiProcessing,
        login, createRoom, createCharacter, createCharacterOnJoin,
        joinRoom, joinGameRoom, sendAction, sendRoll,
        startCampaign, emitTyping, emitTypingStop, listRooms,
        listSavedCampaigns, resumeCampaign, deleteSavedCampaign, leaveRoom,
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
