import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { NOTIFICATION_EVENT } from '../../../../common/constants/notification-events';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { createId } from '../../../../common/utils/id';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsQueue } from '../../../notifications/queue/notifications.queue';
import type { BroadcastPayload } from '../../../notifications/handlers/broadcast.handler';
import { AdminAuditAction } from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import {
  BroadcastAudienceKind,
  type BroadcastAudienceDto,
  type BroadcastDto,
} from './dto/broadcast.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

const MAX_RECIPIENTS = 50_000;

export interface BroadcastPreview {
  recipientCount: number;
  sample: Array<{ id: string; email: string }>;
}

export interface BroadcastResult {
  broadcastId: string;
  recipientCount: number;
}

@Injectable()
export class AdminBroadcastActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly queue: NotificationsQueue,
  ) {}

  async preview(audience: BroadcastAudienceDto): Promise<BroadcastPreview> {
    const where = this.audienceWhere(audience);
    const [recipientCount, sample] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: { id: true, email: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (recipientCount > MAX_RECIPIENTS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Audience exceeds the ${MAX_RECIPIENTS.toLocaleString()} user cap (${recipientCount.toLocaleString()}). Narrow the audience.`,
      });
    }
    return { recipientCount, sample };
  }

  async send(dto: BroadcastDto, actor: ActorContext): Promise<BroadcastResult> {
    const where = this.audienceWhere(dto.audience);
    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    const recipientUserIds = recipients.map((r) => r.id);

    if (recipientUserIds.length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Audience resolved to zero recipients.',
      });
    }
    if (recipientUserIds.length > MAX_RECIPIENTS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Audience exceeds the ${MAX_RECIPIENTS.toLocaleString()} user cap.`,
      });
    }

    const broadcastId = createId('bcs');
    const payload: BroadcastPayload = {
      title: dto.message.title,
      body: dto.message.body,
      data: dto.message.data,
      broadcastId,
    };

    await this.queue.enqueue({
      event: NOTIFICATION_EVENT.BROADCAST,
      recipientUserIds,
      payload: payload as unknown as Record<string, unknown>,
    });

    await this.audit.record({
      adminId: actor.adminId,
      action: AdminAuditAction.PUSH_BROADCAST_SENT,
      targetId: broadcastId,
      after: {
        broadcastId,
        recipientCount: recipientUserIds.length,
        audience: this.serializeAudience(dto.audience),
        title: dto.message.title,
        body: dto.message.body,
        data: (dto.message.data ?? null) as Prisma.InputJsonValue | null,
      } as Prisma.InputJsonValue,
      request: actor.request,
    });

    return { broadcastId, recipientCount: recipientUserIds.length };
  }

  private audienceWhere(audience: BroadcastAudienceDto): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { status: 'ACTIVE' };
    switch (audience.kind) {
      case BroadcastAudienceKind.ALL:
        return base;
      case BroadcastAudienceKind.ROLE:
        if (!audience.role) {
          throw new AppException(ErrorCode.VALIDATION_FAILED, {
            message: "audience.role is required when kind='role'.",
          });
        }
        return { ...base, role: audience.role };
      case BroadcastAudienceKind.USER_IDS:
        if (!audience.userIds || audience.userIds.length === 0) {
          throw new AppException(ErrorCode.VALIDATION_FAILED, {
            message: "audience.userIds is required when kind='userIds'.",
          });
        }
        return { ...base, id: { in: audience.userIds } };
    }
  }

  private serializeAudience(
    audience: BroadcastAudienceDto,
  ): Record<string, unknown> {
    switch (audience.kind) {
      case BroadcastAudienceKind.ALL:
        return { kind: 'all' };
      case BroadcastAudienceKind.ROLE:
        return { kind: 'role', role: audience.role };
      case BroadcastAudienceKind.USER_IDS:
        return {
          kind: 'userIds',
          count: audience.userIds?.length ?? 0,
        };
    }
  }
}
