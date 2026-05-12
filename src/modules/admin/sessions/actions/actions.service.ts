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

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminSessionsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async revoke(
    sessionId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Session not found.',
      });
    }
    if (existing.revokedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Session has already been revoked.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.SESSION_REVOKED,
        targetType: AdminAuditTargetType.REFRESH_TOKEN,
        targetId: sessionId,
        before: { userId: existing.userId },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
