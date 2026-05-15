import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ListAuditLogDto } from './dto/list-audit-log.dto';
import {
  serializeAdminAuditLogListItem,
  type AdminAuditLogListItem,
} from './list.serializer';

@Injectable()
export class AdminAuditLogListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListAuditLogDto,
  ): Promise<CursorPage<AdminAuditLogListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.AdminAuditLogWhereInput[] = [];
    if (query.adminId) andClauses.push({ adminId: query.adminId });
    if (query.action) andClauses.push({ action: query.action });
    if (query.targetType) andClauses.push({ targetType: query.targetType });
    if (query.targetId) andClauses.push({ targetId: query.targetId });
    if (query.from)
      andClauses.push({ createdAt: { gte: new Date(query.from) } });
    if (query.to) andClauses.push({ createdAt: { lt: new Date(query.to) } });
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.AdminAuditLogWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.adminAuditLog.findMany({
      where,
      include: {
        admin: { select: { id: true, email: true } },
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
      items: page.map(serializeAdminAuditLogListItem),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async listDistinctActions(): Promise<string[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return rows.map((r) => r.action);
  }

  async listDistinctTargetTypes(): Promise<string[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      where: { targetType: { not: null } },
      distinct: ['targetType'],
      select: { targetType: true },
      orderBy: { targetType: 'asc' },
    });
    return rows.map((r) => r.targetType).filter((t): t is string => t !== null);
  }
}
