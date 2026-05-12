import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../shared/admin-audit.constants';
import { AdminAuditService } from '../shared/admin-audit.service';
import type { TakedownDto } from './dto/takedown.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async takedown(
    activityId: string,
    dto: TakedownDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, deletedAt: true, status: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Activity has already been taken down.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activity.update({
        where: { id: activityId },
        data: {
          deletedAt: new Date(),
          deletedById: actor.adminId,
          deletedReason: dto.reason,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ACTIVITY_SOFT_DELETED,
        targetType: AdminAuditTargetType.ACTIVITY,
        targetId: activityId,
        before: { status: existing.status },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
