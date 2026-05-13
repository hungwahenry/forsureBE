import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeAdminAuditLogDetail,
  type AdminAuditLogDetail,
} from './detail.serializer';

@Injectable()
export class AdminAuditLogDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string): Promise<AdminAuditLogDetail> {
    const row = await this.prisma.adminAuditLog.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, email: true } },
      },
    });
    if (!row) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Audit log entry not found.',
      });
    }
    return serializeAdminAuditLogDetail(row);
  }
}
