import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeAdminBusinessVenue,
  type AdminBusinessVenueItem,
} from './venues.serializer';

@Injectable()
export class AdminBusinessVenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string): Promise<AdminBusinessVenueItem[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    const rows = await this.prisma.businessVenue.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeAdminBusinessVenue);
  }
}
