import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSocketContext } from './SocketContext';
import { useAuthContext } from './AuthContext';
import { GameState, SavedCampaignInfo, CharacterKit, Player } from '../types/game.types';

interface PlayerInfo {
  playerId: string;
  roomId: string | null;
}

interface PlayerContextValue {
  player: PlayerInfo;
  createRoom: (name: string, language?: string, campaignTheme?: string) => Promise<void>;
  createCharacter: (roomId: string, name: string, attributes?: Player['attributes'], kitId?: string) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  resumeCampaign: (campaignId: string) => Promise<void>;
  listSavedCampaigns: () => Promise<SavedCampaignInfo[]>;
  deleteSavedCampaign: (campaignId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  backToLobby: () => void;
  allocateAttributes: (allocations: Record<string, number>) => void;
  fetchKits: (roomId: string) => Promise<CharacterKit[]>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { on, off, emit } = useSocketContext();
  const { dispatch, setError, page } = useAuthContext();
  const [player, setPlayer] = useState<PlayerInfo>({ playerId: '', roomId: null });
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    const handleRegistered = (data: { playerId: string }) => {
      setPlayer(prev => ({ ...prev, playerId: data.playerId }));
    };

    const handleDisconnect = () => {
      setPlayer({ playerId: '', roomId: null });
    };

    on('player:registered', handleRegistered);
    on('disconnect', handleDisconnect);

    return () => {
      off('player:registered', handleRegistered);
      off('disconnect', handleDisconnect);
    };
  }, [on, off]);

  useEffect(() => {
    if (page === 'login' || page === 'lobby') {
      setPlayer({ playerId: '', roomId: null });
    }
  }, [page]);

  const createRoom = useCallback((name: string, language?: string, campaignTheme?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:create', { name, language, campaignTheme }, (response: any) => {
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
  }, [emit, dispatch, setError]);

  const createCharacter = useCallback((roomId: string, name: string, attributes?: Player['attributes'], kitId?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:create_character', { roomId, name, attributes, kitId }, (response: any) => {
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
  }, [emit, dispatch, setError]);

  const joinRoom = useCallback((roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:join', { roomId }, (response: any) => {
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
  }, [emit, dispatch, setError]);

  const resumeCampaign = useCallback((campaignId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:resume', { campaignId }, (response: any) => {
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
  }, [emit, dispatch, setError]);

  const listSavedCampaigns = useCallback((): Promise<SavedCampaignInfo[]> => {
    return new Promise((resolve) => {
      emit('lobby:list_saved', (response: any) => resolve(response?.campaigns || []));
    });
  }, [emit]);

  const deleteSavedCampaign = useCallback((campaignId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      emit('lobby:delete_saved', { campaignId }, (response: any) => {
        if (response.success) {
          resolve(true);
        } else {
          setError(response.error);
          resolve(false);
        }
      });
    });
  }, [emit, setError]);

  const leaveRoom = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!playerRef.current.roomId || !playerRef.current.playerId) { reject(new Error('Not connected')); return; }
      emit('room:leave', { roomId: playerRef.current.roomId, playerId: playerRef.current.playerId }, (response: any) => {
        if (response.success) {
          setPlayer({ playerId: '', roomId: null });
          dispatch({ type: 'LEFT_ROOM' });
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to leave'));
        }
      });
    });
  }, [emit, dispatch]);

  const backToLobby = useCallback(() => {
    setPlayer({ playerId: '', roomId: null });
    dispatch({ type: 'LEFT_ROOM' });
  }, [dispatch]);

  const allocateAttributes = useCallback((allocations: Record<string, number>) => {
    if (!playerRef.current.roomId || !playerRef.current.playerId) return;
    emit('game:allocate_attributes', {
      roomId: playerRef.current.roomId,
      playerId: playerRef.current.playerId,
      allocations,
    });
  }, [emit]);

  const fetchKits = useCallback((roomId: string): Promise<CharacterKit[]> => {
    return new Promise((resolve) => {
      emit('game:get_kits', { roomId }, (response: any) => {
        resolve(response?.kits || []);
      });
    });
  }, [emit]);

  return (
    <PlayerContext.Provider value={{
      player, createRoom, createCharacter, joinRoom, resumeCampaign,
      listSavedCampaigns, deleteSavedCampaign, leaveRoom, backToLobby,
      allocateAttributes, fetchKits,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerContext must be used within PlayerProvider');
  return ctx;
}
