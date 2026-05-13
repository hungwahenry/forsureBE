import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import {
  serializeBusinessMembership,
  type BusinessMembershipDto,
} from './business.serializer';

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async listMembershipsForUser(
    userId: string,
  ): Promise<BusinessMembershipDto[]> {
    const rows = await this.prisma.businessMember.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => serializeBusinessMembership(this.storage, row));
  }
}
