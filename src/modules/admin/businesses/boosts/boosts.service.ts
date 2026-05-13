import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import {
  serializeAdminBusinessBoost,
  type AdminBusinessBoostItem,
} from './boosts.serializer';
import type { ReasonDto } from './dto/reason.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminBusinessBoostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(businessId: string): Promise<AdminBusinessBoostItem[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    const rows = await this.prisma.activityBoost.findMany({
      where: { businessId },
      include: {
        activity: { select: { emoji: true, title: true, startsAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(serializeAdminBusinessBoost);
  }

  async forceCancel(
    boostId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const boost = await this.prisma.activityBoost.findUnique({
      where: { id: boostId },
      select: { id: true, cancelledAt: true, endsAt: true, businessId: true },
    });
    if (!boost) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Boost not found.',
      });
    }
    if (boost.cancelledAt || boost.endsAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Boost is already finalised.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activityBoost.update({
        where: { id: boostId },
        data: { cancelledAt: new Date() },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_BOOST_FORCE_CANCELLED,
        targetType: AdminAuditTargetType.BUSINESS_BOOST,
        targetId: boostId,
        before: { businessId: boost.businessId },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
