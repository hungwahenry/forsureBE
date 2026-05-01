import { Injectable } from '@nestjs/common';
import { ReportTargetType } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import {
  serializeReason,
  serializeReport,
  type ReportDto,
  type ReportReasonDto,
} from './reports.serializer';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listReasons(targetType: ReportTargetType): Promise<ReportReasonDto[]> {
    const reasons = await this.prisma.reportReason.findMany({
      where: {
        active: true,
        OR: [{ isGeneral: true }, { applicableTo: { has: targetType } }],
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return reasons.map(serializeReason);
  }

  async submitReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportDto> {
    const reason = await this.prisma.reportReason.findUnique({
      where: { id: dto.reasonId },
    });
    if (!reason || !reason.active) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'That report reason is no longer available.',
      });
    }
    if (!reason.isGeneral && !reason.applicableTo.includes(dto.targetType)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: "That reason doesn't apply to this kind of report.",
      });
    }

    await this.requireTargetExists(dto.targetType, dto.targetId);

    if (
      dto.targetType === ReportTargetType.USER &&
      dto.targetId === reporterId
    ) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: "You can't report yourself.",
      });
    }

    const detailsTrimmed = dto.details?.trim() || null;

    const report = await this.prisma.report.upsert({
      where: {
        reporterId_targetType_targetId: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
      create: {
        id: createId('rep'),
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reasonId: reason.id,
        details: detailsTrimmed,
      },
      update: {
        reasonId: reason.id,
        details: detailsTrimmed,
      },
    });

    return serializeReport(report);
  }

  private async requireTargetExists(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    const exists = await this.targetExists(targetType, targetId);
    if (!exists) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: "We couldn't find what you're trying to report.",
      });
    }
  }

  private async targetExists(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<boolean> {
    switch (targetType) {
      case ReportTargetType.USER: {
        const row = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        return row !== null;
      }
      case ReportTargetType.ACTIVITY: {
        const row = await this.prisma.activity.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        return row !== null;
      }
      case ReportTargetType.MESSAGE: {
        const row = await this.prisma.chatMessage.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        return row !== null;
      }
    }
  }
}
