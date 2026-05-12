import { Injectable } from '@nestjs/common';
import { ActivityStatus, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import type { AdminEditActivityDto } from './dto/edit-activity.dto';
import type { ReasonDto } from './dto/reason.dto';
import type { ReassignHostDto } from './dto/reassign-host.dto';
import type { TakedownDto } from './dto/takedown.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminActivitiesActionsService {
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

  async cancel(
    activityId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    await this.statusTransition(activityId, ActivityStatus.CANCELLED, actor, {
      action: AdminAuditAction.ACTIVITY_FORCE_CANCELLED,
      reason: dto.reason,
    });
  }

  async markDone(
    activityId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    await this.statusTransition(activityId, ActivityStatus.DONE, actor, {
      action: AdminAuditAction.ACTIVITY_FORCE_DONE,
      reason: dto.reason,
    });
  }

  async reassignHost(
    activityId: string,
    dto: ReassignHostDto,
    actor: ActorContext,
  ): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, deletedAt: true },
    });
    if (!activity) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Cannot reassign host on a taken-down activity.',
      });
    }

    const currentHost = await this.prisma.activityParticipant.findFirst({
      where: { activityId, role: 'HOST' },
      select: { id: true, userId: true },
    });
    const newHostMembership = await this.prisma.activityParticipant.findUnique({
      where: { activityId_userId: { activityId, userId: dto.newHostId } },
      select: { id: true, role: true },
    });
    if (!newHostMembership) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'New host must already be a member of this activity.',
      });
    }
    if (currentHost && currentHost.userId === dto.newHostId) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'User is already the host.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (currentHost) {
        await tx.activityParticipant.update({
          where: { id: currentHost.id },
          data: { role: 'MEMBER' },
        });
      }
      await tx.activityParticipant.update({
        where: { id: newHostMembership.id },
        data: { role: 'HOST' },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ACTIVITY_HOST_REASSIGNED,
        targetType: AdminAuditTargetType.ACTIVITY,
        targetId: activityId,
        before: { hostUserId: currentHost?.userId ?? null },
        after: { hostUserId: dto.newHostId },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async edit(
    activityId: string,
    dto: AdminEditActivityDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        deletedAt: true,
        emoji: true,
        title: true,
        startsAt: true,
        capacity: true,
        participantCount: true,
        memoriesShareablePublicly: true,
      },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Cannot edit a taken-down activity.',
      });
    }
    if (
      dto.capacity !== undefined &&
      dto.capacity < existing.participantCount
    ) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Capacity cannot be less than current participant count (${existing.participantCount}).`,
      });
    }

    const updates: Prisma.ActivityUpdateInput = {};
    if (dto.emoji !== undefined) updates.emoji = dto.emoji;
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.startsAt !== undefined) updates.startsAt = dto.startsAt;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
    if (dto.memoriesShareablePublicly !== undefined) {
      updates.memoriesShareablePublicly = dto.memoriesShareablePublicly;
    }
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
    if (before.startsAt instanceof Date) {
      before.startsAt = before.startsAt.toISOString();
    }
    if (after.startsAt instanceof Date) {
      after.startsAt = after.startsAt.toISOString();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activity.update({ where: { id: activityId }, data: updates });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ACTIVITY_EDITED,
        targetType: AdminAuditTargetType.ACTIVITY,
        targetId: activityId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        request: actor.request,
        tx,
      });
    });
  }

  private async statusTransition(
    activityId: string,
    next: ActivityStatus,
    actor: ActorContext,
    audit: { action: AdminAuditAction; reason?: string },
  ): Promise<void> {
    const existing = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Cannot change status on a taken-down activity.',
      });
    }
    if (
      existing.status === ActivityStatus.CANCELLED ||
      existing.status === ActivityStatus.DONE
    ) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Activity is already ${existing.status.toLowerCase()}.`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activity.update({
        where: { id: activityId },
        data: { status: next },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: audit.action,
        targetType: AdminAuditTargetType.ACTIVITY,
        targetId: activityId,
        before: { status: existing.status },
        after: { status: next },
        reason: audit.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
