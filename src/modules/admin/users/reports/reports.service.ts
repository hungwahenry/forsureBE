import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ListUserReportsDto, ReportDirection } from './dto/list-user-reports.dto';
import {
  serializeAdminUserReport,
  type AdminUserReportItem,
} from './reports.serializer';

@Injectable()
export class AdminUserReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListUserReportsDto,
  ): Promise<CursorPage<AdminUserReportItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const directionFilter: Prisma.ReportWhereInput =
      query.direction === ReportDirection.AGAINST
        ? { targetType: 'USER', targetId: userId }
        : { reporterId: userId };

    const where: Prisma.ReportWhereInput = {
      ...directionFilter,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.report.findMany({
      where,
      include: {
        reason: { select: { id: true, code: true, label: true } },
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
      items: page.map(serializeAdminUserReport),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
