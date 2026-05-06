import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { decodeTsIdCursor, encodeTsIdCursor } from '../../common/utils/cursor';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import type { ListNotificationsDto } from './dto/list-notifications.dto';
import type { MarkReadDto } from './dto/mark-read.dto';
import {
  serializeNotification,
  type NotificationDto,
} from './inbox.serializer';

export interface InboxRow {
  userId: string;
  eventCode: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface GroupedInboxRow extends InboxRow {
  groupKey: string;
}

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persist one row per recipient. Inbox is the canonical "got notified" record. */
  async write(rows: InboxRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.prisma.notification.createMany({
      data: rows.map((r) => ({
        id: createId('ntn'),
        userId: r.userId,
        eventCode: r.eventCode,
        title: r.title,
        body: r.body,
        data: r.data as Prisma.InputJsonValue,
      })),
    });
  }

  async writeGrouped(rows: GroupedInboxRow[]): Promise<void> {
    if (rows.length === 0) return;
    const now = new Date();
    await Promise.all(
      rows.map((r) =>
        this.prisma.notification.upsert({
          where: { userId_groupKey: { userId: r.userId, groupKey: r.groupKey } },
          create: {
            id: createId('ntn'),
            userId: r.userId,
            eventCode: r.eventCode,
            title: r.title,
            body: r.body,
            data: r.data as Prisma.InputJsonValue,
            groupKey: r.groupKey,
          },
          update: {
            title: r.title,
            body: r.body,
            data: r.data as Prisma.InputJsonValue,
            readAt: null,
            createdAt: now,
          },
        }),
      ),
    );
  }
  async list(
    userId: string,
    query: ListNotificationsDto,
  ): Promise<CursorPage<NotificationDto>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.ts) } },
                {
                  createdAt: new Date(cursor.ts),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({ ts: last.createdAt.getTime(), id: last.id })
        : null;

    return {
      items: page.map(serializeNotification),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, dto: MarkReadDto): Promise<void> {
    const now = new Date();
    if (dto.ids && dto.ids.length > 0) {
      await this.prisma.notification.updateMany({
        where: { userId, id: { in: dto.ids }, readAt: null },
        data: { readAt: now },
      });
      return;
    }
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    });
  }
}
