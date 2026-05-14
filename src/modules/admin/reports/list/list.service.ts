import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import type { ListReportsDto } from './dto/list-reports.dto';
import {
  serializeAdminReportListItem,
  type AdminReportListItem,
} from './list.serializer';

@Injectable()
export class AdminReportsListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(query: ListReportsDto): Promise<CursorPage<AdminReportListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.ReportWhereInput[] = [];
    if (query.status) andClauses.push({ status: query.status });
    if (query.targetType) andClauses.push({ targetType: query.targetType });
    if (query.reporterId) andClauses.push({ reporterId: query.reporterId });
    if (query.reasonCode) {
      andClauses.push({ reason: { code: query.reasonCode } });
    }
    if (query.businessId) {
      const venues = await this.prisma.businessVenue.findMany({
        where: { businessId: query.businessId },
        select: { id: true },
      });
      const venueIds = venues.map((v) => v.id);
      if (venueIds.length === 0) {
        return {
          items: [],
          pageInfo: { nextCursor: null, hasMore: false },
        };
      }
      andClauses.push({
        targetType: 'BUSINESS_VENUE',
        targetId: { in: venueIds },
      });
    }
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.ReportWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.report.findMany({
      where,
      include: {
        reason: { select: { id: true, code: true, label: true } },
        reporter: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
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
      items: page.map((row) =>
        serializeAdminReportListItem(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
