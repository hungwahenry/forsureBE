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
import type { ReasonDto } from './dto/reason.dto';
import type { SuspendBusinessDto } from './dto/suspend-business.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminBusinessesActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async suspend(
    businessId: string,
    dto: SuspendBusinessDto,
    actor: ActorContext,
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, suspendedAt: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    if (business.suspendedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Business is already suspended.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: {
          suspendedAt: new Date(),
          suspendedById: actor.adminId,
          suspendedReason: dto.reason,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_SUSPENDED,
        targetType: AdminAuditTargetType.BUSINESS,
        targetId: businessId,
        after: { reason: dto.reason },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async unsuspend(
    businessId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, suspendedAt: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    if (!business.suspendedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Business is not suspended.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: {
          suspendedAt: null,
          suspendedById: null,
          suspendedReason: null,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_UNSUSPENDED,
        targetType: AdminAuditTargetType.BUSINESS,
        targetId: businessId,
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async liftAutoPause(
    businessId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, autoPausedAt: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    if (!business.autoPausedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Business is not auto-paused.',
      });
    }
    const pausedAt = business.autoPausedAt.toISOString();

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: { autoPausedAt: null },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_AUTO_PAUSE_LIFTED,
        targetType: AdminAuditTargetType.BUSINESS,
        targetId: businessId,
        before: { autoPausedAt: pausedAt },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
