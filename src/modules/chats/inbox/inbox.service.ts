import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ChatPreviewDto } from '../chats.interface';
import { findChatPreviews } from './inbox.queries';
import { serializePreview } from './inbox.serializer';

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async listChats(userId: string): Promise<ChatPreviewDto[]> {
    const rows = await findChatPreviews(this.prisma, userId);
    return rows.map(serializePreview);
  }
}
