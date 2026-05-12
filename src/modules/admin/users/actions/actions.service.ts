import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DataExportService } from '../../../account/export/export.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import type { AdminEditProfileDto } from './dto/edit-profile.dto';
import type { ReasonDto } from './dto/reason.dto';
import type { SuspendUserDto } from './dto/suspend-user.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminUserActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly dataExport: DataExportService,
  ) {}

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, role: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'User not found.',
      });
    }
    return user;
  }

  async suspend(
    userId: string,
    dto: SuspendUserDto,
    actor: ActorContext,
  ): Promise<void> {
    const target = await this.requireUser(userId);
    if (target.id === actor.adminId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'You cannot suspend your own account.',
      });
    }
    if (target.role === 'SUPER_ADMIN') {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Super admins cannot be suspended via this endpoint.',
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: now,
          suspendedUntil: dto.until ?? null,
          suspendedReason: dto.reason,
          suspendedById: actor.adminId,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.USER_SUSPENDED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        after: {
          reason: dto.reason,
          until: dto.until?.toISOString() ?? null,
        },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async unsuspend(
    userId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!target) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'User not found.',
      });
    }
    if (target.status !== 'SUSPENDED') {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'User is not suspended.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
          suspendedUntil: null,
          suspendedReason: null,
          suspendedById: null,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.USER_UNSUSPENDED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async forceLogout(
    userId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<{ revokedCount: number }> {
    await this.requireUser(userId);
    const now = new Date();
    let revokedCount = 0;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      revokedCount = result.count;
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.USER_FORCE_LOGOUT,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        after: { revokedCount },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
    return { revokedCount };
  }

  async triggerDataExport(
    userId: string,
    actor: ActorContext,
  ): Promise<{ exportRequestId: string }> {
    await this.requireUser(userId);
    const result = await this.dataExport.request(userId);
    await this.audit.record({
      adminId: actor.adminId,
      action: AdminAuditAction.USER_DATA_EXPORT_TRIGGERED,
      targetType: AdminAuditTargetType.USER,
      targetId: userId,
      after: { exportRequestId: result.requestId, status: result.status },
      request: actor.request,
    });
    return { exportRequestId: result.requestId };
  }

  async editProfile(
    userId: string,
    dto: AdminEditProfileDto,
    actor: ActorContext,
  ): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        displayName: true,
        username: true,
        bio: true,
      },
    });
    if (!profile) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'User has no profile to edit.',
      });
    }

    const updates: Prisma.ProfileUpdateInput = {};
    if (dto.displayName !== undefined) updates.displayName = dto.displayName;
    if (dto.username !== undefined) updates.username = dto.username;
    if (dto.bio !== undefined) updates.bio = dto.bio;

    if (Object.keys(updates).length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No fields provided to update.',
      });
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
      before[key] = profile[key as keyof typeof profile];
      after[key] = updates[key];
    }

    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.profile.update({ where: { userId }, data: updates });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
            message: 'Username is already taken.',
          });
        }
        throw err;
      }
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.USER_PROFILE_EDITED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        request: actor.request,
        tx,
      });
    });
  }
}
