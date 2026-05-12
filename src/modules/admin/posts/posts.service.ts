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
export class AdminPostsService {
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
}
