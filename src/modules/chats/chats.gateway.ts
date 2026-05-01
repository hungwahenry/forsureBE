import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { Env } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/jwt.strategy';
import type { ChatMessageDto } from './chats.interface';
import { requireChatMembership } from './utils/membership';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

const ROOM = (activityId: string) => `chat:${activityId}`;

@Injectable()
@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: true, credentials: true },
})
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ----- Lifecycle -----

  handleConnection(socket: Socket): void {
    const token =
      (socket.handshake.auth as { token?: string } | undefined)?.token ??
      this.bearerFromHeader(socket.handshake.headers.authorization);
    if (!token) {
      socket.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      (socket as AuthedSocket).data = { userId: payload.sub };
    } catch {
      socket.disconnect(true);
    }
  }

  // ----- Client → server -----

  @SubscribeMessage('chat:join')
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() body: { activityId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const activityId = body?.activityId;
    if (!activityId) return { ok: false, error: 'activityId required' };
    try {
      await requireChatMembership(this.prisma, socket.data.userId, activityId);
    } catch {
      return { ok: false, error: 'forbidden' };
    }
    await socket.join(ROOM(activityId));
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  async onLeave(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() body: { activityId?: string },
  ): Promise<{ ok: true }> {
    if (body?.activityId) await socket.leave(ROOM(body.activityId));
    return { ok: true };
  }

  @SubscribeMessage('chat:typing')
  onTyping(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() body: { activityId?: string; isTyping?: boolean },
  ): void {
    if (!body?.activityId) return;
    if (!socket.rooms.has(ROOM(body.activityId))) return; // must have joined
    socket
      .to(ROOM(body.activityId))
      .emit(body.isTyping ? 'typing.start' : 'typing.stop', {
        userId: socket.data.userId,
        activityId: body.activityId,
      });
  }

  // ----- Server → clients (called from ChatsService and JoinActivityService) -----

  broadcastNewMessage(activityId: string, message: ChatMessageDto): void {
    this.server.to(ROOM(activityId)).emit('message.new', { message });
  }

  broadcastDeletedMessage(activityId: string, messageId: string): void {
    this.server
      .to(ROOM(activityId))
      .emit('message.deleted', { activityId, messageId });
  }

  //Force a user out of an activity's chat — called when they leave the chat
  async kickFromChat(activityId: string, userId: string): Promise<void> {
    const room = ROOM(activityId);
    const sockets = await this.server.in(room).fetchSockets();
    for (const s of sockets) {
      const sUserId = (s.data as { userId?: string }).userId;
      if (sUserId === userId) {
        s.emit('chat:removed', { activityId });
        s.leave(room);
      }
    }
  }

  private bearerFromHeader(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
