import { io, Socket } from 'socket.io-client';

type EventCallback = (...args: any[]) => void;

let socket: Socket | null = null;
const listeners = new Map<string, Set<EventCallback>>();

export function on(event: string, callback: EventCallback): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);
}

export function off(event: string, callback: EventCallback): void {
  listeners.get(event)?.delete(callback);
}

export function emit(event: string, ...args: any[]): void {
  socket?.emit(event, ...args);
}

function emitToListeners(event: string, ...args: any[]): void {
  listeners.get(event)?.forEach(cb => {
    try { cb(...args); } catch (e) { console.error(`Listener error on ${event}:`, e); }
  });
}

export function initSocket(): () => void {
  const s = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  s.on('connect', () => {
    emitToListeners('connect');
  });

  s.on('disconnect', () => {
    emitToListeners('disconnect');
  });

  s.onAny((event, ...args) => {
    emitToListeners(event, ...args);
  });

  socket = s;

  return () => {
    socket = null;
    s.disconnect();
  };
}
