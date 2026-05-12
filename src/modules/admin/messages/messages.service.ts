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
export class AdminMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async takedown(
    messageId: string,
    dto: TakedownDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, deletedAt: true, activityId: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Message not found.',
      });
    }
    if (existing.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Message has already been taken down.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          deletedById: actor.adminId,
          deletedReason: dto.reason,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.MESSAGE_DELETED,
        targetType: AdminAuditTargetType.MESSAGE,
        targetId: messageId,
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
