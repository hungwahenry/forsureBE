import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../shared/admin-audit.constants';
import { AdminAuditService } from '../shared/admin-audit.service';
import type { CreateReportReasonDto } from './dto/create-reason.dto';
import type { UpdateReportReasonDto } from './dto/update-reason.dto';
import {
  serializeAdminReportReason,
  type AdminReportReasonItem,
} from './report-reasons.serializer';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminReportReasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<AdminReportReasonItem[]> {
    const reasons = await this.prisma.reportReason.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (reasons.length === 0) return [];
    const counts = await this.prisma.report.groupBy({
      by: ['reasonId'],
      _count: { _all: true },
      where: { reasonId: { in: reasons.map((r) => r.id) } },
    });
    const countsByReason = new Map(
      counts.map((c) => [c.reasonId, c._count._all]),
    );
    return reasons.map((r) =>
      serializeAdminReportReason(r, countsByReason.get(r.id) ?? 0),
    );
  }

  async create(
    dto: CreateReportReasonDto,
    actor: ActorContext,
  ): Promise<AdminReportReasonItem> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.reportReason.create({
          data: {
            id: createId('rsn'),
            code: dto.code,
            label: dto.label,
            description: dto.description,
            applicableTo: dto.applicableTo,
            isGeneral: dto.isGeneral ?? false,
            active: dto.active ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
        await this.audit.record({
          adminId: actor.adminId,
          action: AdminAuditAction.REPORT_REASON_CREATED,
          targetType: AdminAuditTargetType.REPORT_REASON,
          targetId: created.id,
          after: { code: created.code, label: created.label },
          request: actor.request,
          tx,
        });
        return created;
      });
      return serializeAdminReportReason(row, 0);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: `Reason code "${dto.code}" already exists.`,
        });
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateReportReasonDto,
    actor: ActorContext,
  ): Promise<AdminReportReasonItem> {
    const existing = await this.prisma.reportReason.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Reason not found.',
      });
    }
    const updates: Prisma.ReportReasonUpdateInput = {};
    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.applicableTo !== undefined) updates.applicableTo = dto.applicableTo;
    if (dto.isGeneral !== undefined) updates.isGeneral = dto.isGeneral;
    if (dto.active !== undefined) updates.active = dto.active;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;
    if (Object.keys(updates).length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No fields provided to update.',
      });
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      before[key] = (existing as Record<string, unknown>)[key];
      after[key] = (updates as Record<string, unknown>)[key];
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reportReason.update({
        where: { id },
        data: updates,
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.REPORT_REASON_UPDATED,
        targetType: AdminAuditTargetType.REPORT_REASON,
        targetId: id,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        request: actor.request,
        tx,
      });
      return updated;
    });
    const reportsCount = await this.prisma.report.count({
      where: { reasonId: id },
    });
    return serializeAdminReportReason(row, reportsCount);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.prisma.reportReason.findUnique({
      where: { id },
      select: { id: true, code: true, label: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Reason not found.',
      });
    }
    const reportsCount = await this.prisma.report.count({
      where: { reasonId: id },
    });
    if (reportsCount > 0) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Cannot delete a reason that ${reportsCount} report${reportsCount === 1 ? '' : 's'} reference${reportsCount === 1 ? '' : ''}. Deactivate it instead.`,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.reportReason.delete({ where: { id } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.REPORT_REASON_DELETED,
        targetType: AdminAuditTargetType.REPORT_REASON,
        targetId: id,
        before: { code: existing.code, label: existing.label },
        request: actor.request,
        tx,
      });
    });
  }
}
