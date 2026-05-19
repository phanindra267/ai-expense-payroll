import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/tokenRotation';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    organisationId: string;
    role: string;
  };
}

let io: Server | undefined;

export function initWebSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const authHeader = socket.handshake.headers.authorization;
    let token = socket.handshake.auth.token;

    if (!token && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.user;
    if (!user) return;

    const orgRoom = `org:${user.organisationId}`;

    // Join org-scoped room
    authSocket.join(orgRoom);
    logger.info('Socket connected', { userId: user.userId, orgId: user.organisationId });

    // Missed event recovery
    authSocket.on('request:missed-events', async ({ since }: { since: string }) => {
      logger.info('Client requesting missed events', { since, userId: user.userId });
      authSocket.emit('missed:events:ack', { message: 'Replay not supported in this version. Dashboard will refresh.' });
    });

    authSocket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId: user.userId, reason });
    });
  });

  return io;
}

// Safe getter helper
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket Server not initialized');
  }
  return io;
}

// ─── Emit helpers (used by controllers/workers) ───────────────────────────────
export function emitToOrg(organisationId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`org:${organisationId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
}

export { io };

