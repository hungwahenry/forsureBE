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
export class AdminBlocksActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async remove(
    blockId: string,
    dto: ReasonDto,
    actor: ActorContext,
  ): Promise<void> {
    const existing = await this.prisma.userBlock.findUnique({
      where: { id: blockId },
      select: { id: true, blockerId: true, blockedId: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Block not found.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userBlock.delete({ where: { id: blockId } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BLOCK_OVERRIDE,
        targetType: AdminAuditTargetType.BLOCK,
        targetId: blockId,
        before: {
          blockerId: existing.blockerId,
          blockedId: existing.blockedId,
        },
        reason: dto.reason,
        request: actor.request,
        tx,
      });
    });
  }
}
