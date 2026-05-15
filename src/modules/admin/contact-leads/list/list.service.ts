import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ListContactLeadsDto } from './dto/list-contact-leads.dto';
import {
  serializeContactLeadListItem,
  type AdminContactLeadListItem,
} from './list.serializer';

@Injectable()
export class AdminContactLeadsListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListContactLeadsDto,
  ): Promise<CursorPage<AdminContactLeadListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.ContactLeadWhereInput[] = [];
    if (query.status) andClauses.push({ status: query.status });
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.ContactLeadWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.contactLead.findMany({
      where,
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
      items: page.map(serializeContactLeadListItem),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
