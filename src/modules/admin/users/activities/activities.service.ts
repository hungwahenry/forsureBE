import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ListUserActivitiesDto } from './dto/list-user-activities.dto';
import {
  serializeAdminUserActivity,
  type AdminUserActivityItem,
} from './activities.serializer';

@Injectable()
export class AdminUserActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListUserActivitiesDto,
  ): Promise<CursorPage<AdminUserActivityItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const where: Prisma.ActivityParticipantWhereInput = {
      userId,
      ...(query.role ? { role: query.role } : {}),
      ...(cursor
        ? {
            OR: [
              { joinedAt: { lt: new Date(cursor.ts) } },
              { joinedAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.activityParticipant.findMany({
      where,
      include: { activity: true },
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({ ts: last.joinedAt.getTime(), id: last.id })
        : null;

    return {
      items: page.map(serializeAdminUserActivity),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
