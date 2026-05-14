import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  serializeBusinessCategory,
  type BusinessCategoryDto,
} from './business-categories.serializer';

@Injectable()
export class PublicBusinessCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<BusinessCategoryDto[]> {
    const rows = await this.prisma.businessCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map(serializeBusinessCategory);
  }
}
