import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ReportStatus } from '@prisma/client';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import { DismissReportDto, ResolveReportDto } from './dto/resolve-report.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminReportsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async resolve(
    reportId: string,
    dto: ResolveReportDto,
    actor: ActorContext,
  ): Promise<void> {
    await this.transition(reportId, ReportStatus.REVIEWED, actor, {
      action: AdminAuditAction.REPORT_MARKED_REVIEWED,
      reason: dto.notes,
    });
  }

  async dismiss(
    reportId: string,
    dto: DismissReportDto,
    actor: ActorContext,
  ): Promise<void> {
    await this.transition(reportId, ReportStatus.DISMISSED, actor, {
      action: AdminAuditAction.REPORT_DISMISSED,
      reason: dto.reason,
    });
  }

  private async transition(
    reportId: string,
    next: ReportStatus,
    actor: ActorContext,
    audit: { action: AdminAuditAction; reason?: string },
  ): Promise<void> {
    const existing = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Report not found.',
      });
    }
    if (existing.status !== ReportStatus.PENDING) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Report is already ${existing.status.toLowerCase()}.`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: next,
          reviewedAt: new Date(),
          reviewedBy: actor.adminId,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: audit.action,
        targetType: AdminAuditTargetType.REPORT,
        targetId: reportId,
        before: { status: existing.status },
        after: { status: next },
        reason: audit.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
