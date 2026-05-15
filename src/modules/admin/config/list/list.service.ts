import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { serializeAdminConfig, type AdminConfigItem } from './list.serializer';

@Injectable()
export class AdminConfigListService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: AdminConfigItem[] }> {
    const rows = await this.prisma.appConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return { items: rows.map(serializeAdminConfig) };
  }
}
