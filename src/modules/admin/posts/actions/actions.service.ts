import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import type { AdminEditPostDto } from './dto/edit-post.dto';
import type { TakedownDto } from './dto/takedown.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminPostsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async takedown(
    postId: string,
    dto: TakedownDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.activityPost.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Post not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Post has already been taken down.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.activityPost.update({
        where: { id: postId },
        data: {
          deletedAt: new Date(),
          deletedById: actor.adminId,
          deletedReason: dto.reason,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.POST_DELETED,
        targetType: AdminAuditTargetType.POST,
        targetId: postId,
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }

  async edit(
    postId: string,
    dto: AdminEditPostDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.activityPost.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true, visibility: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Post not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Cannot edit a taken-down post.',
      });
    }
    const updates: Prisma.ActivityPostUpdateInput = {};
    if (dto.visibility !== undefined) updates.visibility = dto.visibility;
    if (Object.keys(updates).length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No fields provided to update.',
      });
    }
    if (
      dto.visibility !== undefined &&
      dto.visibility === existing.visibility
    ) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Visibility is already ${existing.visibility.toLowerCase()}.`,
      });
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      before[key] = (existing as Record<string, unknown>)[key];
      after[key] = (updates as Record<string, unknown>)[key];
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activityPost.update({ where: { id: postId }, data: updates });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.POST_VISIBILITY_CHANGED,
        targetType: AdminAuditTargetType.POST,
        targetId: postId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        request: actor.request,
        tx,
      });
    });
  }
}
