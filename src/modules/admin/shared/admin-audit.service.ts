import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  AdminAuditAction,
  AdminAuditTargetType,
} from './admin-audit.constants';

interface RecordArgs {
  adminId: string;
  action: AdminAuditAction;
  targetType?: AdminAuditTargetType;
  targetId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
  request?: Request;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(args: RecordArgs): Promise<void> {
    const db = args.tx ?? this.prisma;
    await db.adminAuditLog.create({
      data: {
        id: createId('aal'),
        adminId: args.adminId,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        before: args.before,
        after: args.after,
        reason: args.reason,
        ipAddress: args.request?.ip,
        userAgent: args.request?.get('user-agent'),
      },
    });
  }
}
