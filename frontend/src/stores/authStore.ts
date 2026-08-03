import { create } from 'zustand';
import { on, off, emit } from './socket';
import { Page, PageAction, pageReducer } from '../routing/pageRouter';
import type { LoginResponse } from '../types/game.types';

interface AuthState {
  userId: string | null;
  page: Page;
  connected: boolean;
  error: string | null;
  dispatch: (action: PageAction) => void;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
  setError: (error: string | null) => void;
}

export type { AuthState };

export const useAuthStore = create<AuthState>()((set, get) => ({
  userId: null,
  page: 'login',
  connected: false,
  error: null,
  dispatch: (action) => set((state) => ({ page: pageReducer(state.page, action) })),
  login: (uid: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!get().connected) {
        set({ error: 'Not connected to server' });
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        set({ error: 'Connection timed out' });
        resolve(false);
      }, 10000);

      emit('auth:login', { userId: uid }, (response: LoginResponse) => {
        clearTimeout(timeout);
        if (response.success) {
          set({ userId: uid });
          get().dispatch({ type: 'LOGGED_IN' });
          resolve(true);
        } else {
          set({ error: response.error ?? null });
          resolve(false);
        }
      });
    });
  },
  logout: () => {
    set({ userId: null });
    get().dispatch({ type: 'LOGGED_OUT' });
  },
  setError: (error) => set({ error }),
}));

export function initAuth(): () => void {
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const handleConnect = () => {
    setConnected(true);
    const currentUserId = useAuthStore.getState().userId;
    if (currentUserId) {
      emit('auth:login', { userId: currentUserId }, (response: LoginResponse) => {
        if (!response.success) {
          useAuthStore.setState({ userId: null });
          useAuthStore.getState().dispatch({ type: 'LOGGED_OUT' });
        }
      });
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    disconnectTimer = setTimeout(() => {
      useAuthStore.setState({ userId: null });
      useAuthStore.getState().dispatch({ type: 'DISBANDED' });
      disconnectTimer = null;
    }, 10000);
  };

  const handleError = (data: { message: string }) => {
    if (data.message === 'Authentication required' && useAuthStore.getState().userId) {
      useAuthStore.setState({ userId: null });
      useAuthStore.getState().dispatch({ type: 'LOGGED_OUT' });
      return;
    }
    useAuthStore.setState({ error: data.message });
  };

  on('connect', handleConnect);
  on('disconnect', handleDisconnect);
  on('game:error', handleError);

  return () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    off('connect', handleConnect);
    off('disconnect', handleDisconnect);
    off('game:error', handleError);
  };
}

function setConnected(connected: boolean): void {
  useAuthStore.setState({ connected });
}
