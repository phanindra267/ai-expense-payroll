import { io, Socket } from 'socket.io-client';
import { store } from './store';

let socket: Socket | null = null;

export function getSocket(): Socket | null { return socket; }

export function initSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    // Request any missed events since last session
    const since = localStorage.getItem('lastSocketEventAt') || new Date(0).toISOString();
    socket?.emit('request:missed-events', { since });
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
  });

  socket.on('expense:added', (data) => {
    store.dispatch({ type: 'dashboard/invalidate', payload: data });
  });

  socket.on('budget:alert', (data) => {
    console.info('[Socket] Budget alert:', data);
  });

  socket.on('anomaly:detected', (data) => {
    console.warn('[Socket] Anomaly detected:', data);
  });

  socket.onAny((_event) => {
    localStorage.setItem('lastSocketEventAt', new Date().toISOString());
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
