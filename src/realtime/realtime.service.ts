import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const userRoom = (userId: string) => `user:${userId}`;

type ConnectHandler = (userId: string) => Promise<void> | void;

@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private readonly connectHandlers: ConnectHandler[] = [];

  /** Called once by the gateway after Socket.IO boots. */
  bindServer(server: Server): void {
    this.server = server;
  }

  onUserConnected(handler: ConnectHandler): void {
    this.connectHandlers.push(handler);
  }

  async notifyConnected(userId: string): Promise<void> {
    await Promise.all(this.connectHandlers.map(async (h) => h(userId)));
  }

  async joinUserToRoom(userId: string, room: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    for (const s of sockets) s.join(room);
  }

  async leaveUserFromRoom(userId: string, room: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    for (const s of sockets) s.leave(room);
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  toRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }
}
