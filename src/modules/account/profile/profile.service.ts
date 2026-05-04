import { Inject, Injectable } from '@nestjs/common';
import {
  processAndStoreAvatar,
  type UploadedAvatarFile,
} from '../../../common/utils/avatar';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import {
  serializeMyProfile,
  type MyProfileDto,
} from '../../users/users.serializer';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileEditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async update(userId: string, dto: UpdateProfileDto): Promise<MyProfileDto> {
    const data: {
      displayName?: string;
      bio?: string | null;
      placeName?: string;
      locationLat?: number;
      locationLng?: number;
    } = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio.length > 0 ? dto.bio : null;
    if (dto.location) {
      data.placeName = dto.location.placeName;
      data.locationLat = dto.location.lat;
      data.locationLng = dto.location.lng;
    }
    if (Object.keys(data).length > 0) {
      // `locationPoint` is a GENERATED ALWAYS column — Postgres recomputes it
      // from `locationLat`/`locationLng`, so this single update is enough.
      await this.prisma.profile.update({ where: { userId }, data });
    }
    return this.loadMyProfile(userId);
  }

  async updateAvatar(
    userId: string,
    file: UploadedAvatarFile | undefined,
  ): Promise<MyProfileDto> {
    const key = await processAndStoreAvatar(this.storage, userId, file);
    await this.prisma.profile.update({
      where: { userId },
      data: { avatarKey: key },
    });
    return this.loadMyProfile(userId);
  }

  private async loadMyProfile(userId: string): Promise<MyProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    return serializeMyProfile(this.storage, user);
  }
}
