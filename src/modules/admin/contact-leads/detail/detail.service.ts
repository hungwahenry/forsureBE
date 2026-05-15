import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeContactLeadDetail,
  type AdminContactLeadDetail,
} from './detail.serializer';

@Injectable()
export class AdminContactLeadsDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string): Promise<AdminContactLeadDetail> {
    const lead = await this.prisma.contactLead.findUnique({ where: { id } });
    if (!lead) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Contact lead not found.',
      });
    }
    return serializeContactLeadDetail(lead);
  }
}
