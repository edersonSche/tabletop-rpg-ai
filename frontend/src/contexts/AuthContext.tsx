import { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer, ReactNode } from 'react';
import { useSocketContext } from './SocketContext';
import { Page, PageAction, pageReducer } from '../routing/pageRouter';

interface AuthContextValue {
  userId: string | null;
  page: Page;
  connected: boolean;
  dispatch: React.Dispatch<PageAction>;
  error: string | null;
  setError: (error: string | null) => void;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { on, off, emit, connected } = useSocketContext();
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, dispatch] = useReducer(pageReducer, 'login');
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const login = useCallback((uid: string): Promise<boolean> => {
    return new Promise((resolve) => {
      emit('auth:login', { userId: uid }, (response: any) => {
        if (response.success) {
          setUserId(uid);
          dispatch({ type: 'LOGGED_IN' });
          resolve(true);
        } else {
          setError(response.error);
          resolve(false);
        }
      });
    });
  }, [emit]);

  const logout = useCallback(() => {
    setUserId(null);
    dispatch({ type: 'LOGGED_OUT' });
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      const currentUserId = userIdRef.current;
      if (currentUserId) {
        emit('auth:login', { userId: currentUserId }, (response: any) => {
          if (!response.success) {
            setUserId(null);
            dispatch({ type: 'LOGGED_OUT' });
          }
        });
      }
    };

    const handleDisconnect = () => {
      disconnectTimerRef.current = setTimeout(() => {
        setUserId(null);
        dispatch({ type: 'DISBANDED' });
        disconnectTimerRef.current = null;
      }, 10000);
    };

    const handleError = (data: { message: string }) => {
      if (data.message === 'Authentication required' && userIdRef.current) {
        setUserId(null);
        dispatch({ type: 'LOGGED_OUT' });
        return;
      }
      setError(data.message);
    };

    on('connect', handleConnect);
    on('disconnect', handleDisconnect);
    on('game:error', handleError);

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      off('connect', handleConnect);
      off('disconnect', handleDisconnect);
      off('game:error', handleError);
    };
  }, [on, off, emit]);

  return (
    <AuthContext.Provider value={{ userId, page, connected, dispatch, error, setError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
