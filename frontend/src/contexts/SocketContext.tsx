import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

type EventCallback = (...args: any[]) => void;

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  on: (event: string, callback: EventCallback) => void;
  off: (event: string, callback: EventCallback) => void;
  emit: (event: string, ...args: any[]) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  const on = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);
  }, []);

  const off = useCallback((event: string, callback: EventCallback) => {
    listenersRef.current.get(event)?.delete(callback);
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const emitToListeners = useCallback((event: string, ...args: any[]) => {
    listenersRef.current.get(event)?.forEach(cb => {
      try { cb(...args); } catch (e) { console.error(`Listener error on ${event}:`, e); }
    });
  }, []);

  useEffect(() => {
    setSocketReady(true);
  }, []);

  useEffect(() => {
    if (!socketReady) return;

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
      emitToListeners('connect');
    });

    s.on('disconnect', () => {
      setConnected(false);
      emitToListeners('disconnect');
    });

    s.onAny((event, ...args) => {
      emitToListeners(event, ...args);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      s.disconnect();
    };
  }, [socketReady, emitToListeners]);

  return (
    <SocketContext.Provider value={{ socket, connected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
