import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeAdminFeatureFlag,
  type AdminFeatureFlagItem,
} from './list.serializer';

@Injectable()
export class AdminFeatureFlagsListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: AdminFeatureFlagItem[] }> {
    const rows = await this.prisma.featureFlag.findMany({
      include: {
        updatedBy: { select: { id: true, email: true } },
      },
      orderBy: { key: 'asc' },
    });
    return { items: rows.map(serializeAdminFeatureFlag) };
  }
}
