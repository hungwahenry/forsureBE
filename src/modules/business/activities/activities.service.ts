import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  serializeBusinessActivity,
  type BusinessActivityDto,
} from './activities.serializer';

@Injectable()
export class BusinessActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<BusinessActivityDto[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        deletedAt: null,
        participants: { some: { userId, role: ActivityRole.HOST } },
      },
      include: { boosts: true },
      orderBy: { startsAt: 'desc' },
      take: 50,
    });
    return rows.map(serializeBusinessActivity);
  }
}
