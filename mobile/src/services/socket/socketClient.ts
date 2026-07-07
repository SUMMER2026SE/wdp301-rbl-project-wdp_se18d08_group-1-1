import { io, Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/config/env';

type SocketHandler = (...args: unknown[]) => void;

class SocketClient {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect_error', (error) => {
      if (__DEV__) {
        console.warn('[Socket] connection error:', error.message);
      }
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, handler: SocketHandler) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: SocketHandler) {
    this.socket?.off(event, handler);
  }

  emit(event: string, payload?: unknown) {
    this.socket?.emit(event, payload);
  }

  getConnectionStatus() {
    return Boolean(this.socket?.connected);
  }
}

export const socketClient = new SocketClient();
