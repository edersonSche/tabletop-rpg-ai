import { create } from 'zustand';
import { on, off, emit } from './socket';
import { useAuthStore } from './authStore';
import { GameState, SavedCampaignInfo, CharacterKit, Player, CreateRoomResponse, CreateCharacterResponse, JoinRoomResponse, ResumeCampaignResponse, ListSavedCampaignsResponse, DeleteSavedCampaignResponse, LeaveRoomResponse, GetKitsResponse } from '../types/game.types';

interface PlayerInfo {
  playerId: string;
  roomId: string | null;
}

interface PlayerState {
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

export type { PlayerState };

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  player: { playerId: '', roomId: null },

  createRoom: (name: string, language?: string, campaignTheme?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:create', { name, language, campaignTheme }, (response: CreateRoomResponse) => {
        if (response.success) {
          set((state) => ({ player: { ...state.player, roomId: response.room.id } }));
          useAuthStore.getState().dispatch({ type: 'CREATED_ROOM' });
          resolve();
        } else {
          useAuthStore.setState({ error: response.error ?? null });
          reject(new Error(response.error ?? 'Unknown error'));
        }
      });
    });
  },

  createCharacter: (roomId: string, name: string, attributes?: Player['attributes'], kitId?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:create_character', { roomId, name, attributes, kitId }, (response: CreateCharacterResponse) => {
        if (response.success) {
          set((state) => ({ player: { ...state.player, playerId: response.playerId } }));
          if (response.campaignStarted) {
            useAuthStore.getState().dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
          } else {
            useAuthStore.getState().dispatch({ type: 'CHARACTER_CREATED' });
          }
          resolve();
        } else {
          useAuthStore.setState({ error: response.error ?? null });
          reject(new Error(response.error ?? 'Unknown error'));
        }
      });
    });
  },

  joinRoom: (roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:join', { roomId }, (response: JoinRoomResponse) => {
        if (response.success) {
          if (response.needsCharacter) {
            set((state) => ({ player: { ...state.player, roomId } }));
            useAuthStore.getState().dispatch({ type: 'JOIN_NEEDS_CHARACTER' });
          } else {
            set((state) => ({
              player: {
                ...state.player,
                roomId: response.room!.id,
                playerId: response.playerId!,
              },
            }));
            if (response.campaignStarted) {
              useAuthStore.getState().dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
            } else {
              useAuthStore.getState().dispatch({ type: 'JOINED_ROOM' });
            }
          }
          resolve();
        } else {
          useAuthStore.setState({ error: response.error ?? null });
          reject(new Error(response.error ?? 'Unknown error'));
        }
      });
    });
  },

  resumeCampaign: (campaignId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      emit('lobby:resume', { campaignId }, (response: ResumeCampaignResponse) => {
        if (response.success) {
          set((state) => ({
            player: {
              ...state.player,
              roomId: response.room!.id,
              playerId: response.playerId!,
            },
          }));
          if (response.campaignStarted) {
            useAuthStore.getState().dispatch({ type: 'CHARACTER_CREATED_AND_STARTED' });
          } else {
            useAuthStore.getState().dispatch({ type: 'RESUMED_CAMPAIGN' });
          }
          resolve();
        } else {
          useAuthStore.setState({ error: response.error ?? null });
          reject(new Error(response.error ?? 'Unknown error'));
        }
      });
    });
  },

  listSavedCampaigns: (): Promise<SavedCampaignInfo[]> => {
    return new Promise((resolve) => {
      emit('lobby:list_saved', (response: ListSavedCampaignsResponse) => resolve(response?.campaigns || []));
    });
  },

  deleteSavedCampaign: (campaignId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      emit('lobby:delete_saved', { campaignId }, (response: DeleteSavedCampaignResponse) => {
        if (response.success) {
          resolve(true);
        } else {
          useAuthStore.setState({ error: response.error ?? null });
          resolve(false);
        }
      });
    });
  },

  leaveRoom: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { roomId, playerId } = get().player;
      if (!roomId || !playerId) { reject(new Error('Not connected')); return; }
      emit('room:leave', { roomId, playerId }, (response: LeaveRoomResponse) => {
        if (response.success) {
          set({ player: { playerId: '', roomId: null } });
          useAuthStore.getState().dispatch({ type: 'LEFT_ROOM' });
          resolve();
        } else {
          reject(new Error(response.error ?? 'Failed to leave'));
        }
      });
    });
  },

  backToLobby: () => {
    set({ player: { playerId: '', roomId: null } });
    useAuthStore.getState().dispatch({ type: 'LEFT_ROOM' });
  },

  allocateAttributes: (allocations: Record<string, number>) => {
    const { roomId, playerId } = get().player;
    if (!roomId || !playerId) return;
    emit('game:allocate_attributes', { roomId, playerId, allocations });
  },

  fetchKits: (roomId: string): Promise<CharacterKit[]> => {
    return new Promise((resolve) => {
      emit('game:get_kits', { roomId }, (response: GetKitsResponse) => {
        resolve(response?.kits || []);
      });
    });
  },
}));

export function initPlayer(): () => void {
  const handleRegistered = (data: { playerId: string }) => {
    usePlayerStore.setState((state) => ({ player: { ...state.player, playerId: data.playerId } }));
  };

  const unsubscribePage = useAuthStore.subscribe((state, prevState) => {
    if (state.page !== prevState.page && (state.page === 'login' || state.page === 'lobby')) {
      usePlayerStore.setState({ player: { playerId: '', roomId: null } });
    }
  });

  on('player:registered', handleRegistered);

  return () => {
    unsubscribePage();
    off('player:registered', handleRegistered);
  };
}
