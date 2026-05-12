import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminActivityParticipant,
  type AdminActivityParticipantItem,
} from './participants.serializer';

@Injectable()
export class AdminActivityParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    activityId: string,
    query: CursorPaginationDto,
  ): Promise<CursorPage<AdminActivityParticipantItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const where: Prisma.ActivityParticipantWhereInput = {
      activityId,
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
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { id: 'asc' }],
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
      items: page.map((row) =>
        serializeAdminActivityParticipant(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
