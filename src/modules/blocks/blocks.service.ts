import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import {
  serializeBlockedUser,
  type BlockedUserDto,
  type BlockRow,
} from './blocks.serializer';

@Injectable()
export class BlocksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: "You can't block yourself.",
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { id: createId('ublk'), blockerId, blockedId },
      update: {},
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async listBlocked(blockerId: string): Promise<BlockedUserDto[]> {
    const rows = (await this.prisma.userBlock.findMany({
      where: { blockerId },
      include: { blocked: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    })) as BlockRow[];
    return rows
      .map((r) => serializeBlockedUser(this.storage, r))
      .filter((d): d is BlockedUserDto => d !== null);
  }

  /** True if either user has blocked the other. Used by other modules to gate access. */
  async isEitherBlocked(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    const row = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  }

  async listEitherBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.blockerId !== userId) ids.add(r.blockerId);
      if (r.blockedId !== userId) ids.add(r.blockedId);
    }
    return Array.from(ids);
  }
}
