import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { Env } from '../config/env.schema';
import type { AccessTokenPayload } from '../modules/auth/jwt.strategy';
import { RealtimeService, userRoom } from './realtime.service';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit() {
    this.realtime.bindServer(this.server);
  }

  async handleConnection(socket: Socket): Promise<void> {
    const token =
      (socket.handshake.auth as { token?: string } | undefined)?.token ??
      this.bearerFromHeader(socket.handshake.headers.authorization);
    if (!token) {
      socket.disconnect(true);
      return;
    }
    let userId: string;
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      userId = payload.sub;
    } catch {
      socket.disconnect(true);
      return;
    }
    (socket as AuthedSocket).data = { userId };
    await socket.join(userRoom(userId));
    await this.realtime.notifyConnected(userId);
    this.logger.debug({ userId }, 'realtime connected');
  }

  private bearerFromHeader(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
