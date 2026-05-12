import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../../common/constants/error-codes';
import { AppException } from '../../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  serializeAdminCronRunDetail,
  type AdminCronRunDetail,
} from './detail.serializer';

@Injectable()
export class AdminCronDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string): Promise<AdminCronRunDetail> {
    const row = await this.prisma.cronRunLog.findUnique({ where: { id } });
    if (!row) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Cron run not found.',
      });
    }
    return serializeAdminCronRunDetail(row);
  }
}
