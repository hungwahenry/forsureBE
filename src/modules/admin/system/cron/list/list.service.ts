import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../../common/utils/cursor';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { ListCronRunsDto } from './dto/list-cron-runs.dto';
import {
  serializeAdminCronRunListItem,
  type AdminCronRunListItem,
} from './list.serializer';

@Injectable()
export class AdminCronListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListCronRunsDto,
  ): Promise<CursorPage<AdminCronRunListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.CronRunLogWhereInput[] = [];
    if (query.jobName) andClauses.push({ jobName: query.jobName });
    if (query.status) andClauses.push({ status: query.status });
    if (cursor) {
      andClauses.push({
        OR: [
          { startedAt: { lt: new Date(cursor.ts) } },
          { startedAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.CronRunLogWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.cronRunLog.findMany({
      where,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({ ts: last.startedAt.getTime(), id: last.id })
        : null;

    return {
      items: page.map(serializeAdminCronRunListItem),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async listJobNames(): Promise<string[]> {
    const rows = await this.prisma.cronRunLog.findMany({
      distinct: ['jobName'],
      select: { jobName: true },
      orderBy: { jobName: 'asc' },
    });
    return rows.map((r) => r.jobName);
  }
}
