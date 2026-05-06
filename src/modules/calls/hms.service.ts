import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../../config/env.schema';

interface HmsRoomResponse {
  id: string;
}

@Injectable()
export class HmsService {
  private readonly log = new Logger(HmsService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly templateId: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
  ) {
    this.appId = config.get('HMS_APP_ID', { infer: true });
    this.appSecret = config.get('HMS_APP_SECRET', { infer: true });
    this.templateId = config.get('HMS_TEMPLATE_ID', { infer: true });
  }

  /** Generate a short-lived management token for the 100ms REST API. */
  private async managementToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return this.jwt.signAsync(
      { access_key: this.appId, type: 'management', version: 2, iat: now, nbf: now },
      { secret: this.appSecret, algorithm: 'HS256', expiresIn: '24h', jwtid: uuidv4() },
    );
  }

  /** Generate a room auth token for a specific user to join a call. */
  async roomToken(roomId: string, userId: string, username: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return this.jwt.signAsync(
      {
        access_key: this.appId,
        room_id: roomId,
        user_id: userId,
        role: 'participant',
        type: 'app',
        version: 2,
        iat: now,
        nbf: now,
      },
      { secret: this.appSecret, algorithm: 'HS256', expiresIn: '1h', jwtid: uuidv4() },
    );
  }

  /** Create a new 100ms room and return its ID. */
  async createRoom(name: string): Promise<string> {
    const token = await this.managementToken();
    const res = await fetch('https://api.100ms.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        description: name,
        template_id: this.templateId,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.log.error({ status: res.status, body }, '100ms createRoom failed');
      throw new Error(`100ms createRoom failed: ${res.status}`);
    }
    const data = (await res.json()) as HmsRoomResponse;
    return data.id;
  }
}
