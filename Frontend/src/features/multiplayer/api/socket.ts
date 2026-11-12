import { io, type Socket } from 'socket.io-client';
import { env } from '@/shared/config/env';

export function createGameSocket(): Socket {
  return io(env.serverUrl, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });
}
