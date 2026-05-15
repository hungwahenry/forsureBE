import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  processBusinessCover,
  processBusinessLogo,
  type UploadedBusinessImage,
} from '../../../common/utils/business-images';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import type { UpdateBusinessDto } from './dto/update-business.dto';
import { serializeOwnerBusiness, type OwnerBusinessDto } from './me.serializer';

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class BusinessMeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async get(businessId: string): Promise<OwnerBusinessDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { category: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    return serializeOwnerBusiness(this.storage, business);
  }

  async update(
    businessId: string,
    dto: UpdateBusinessDto,
  ): Promise<OwnerBusinessDto> {
    if (dto.categoryId !== undefined) {
      const category = await this.prisma.businessCategory.findUnique({
        where: { id: dto.categoryId },
        select: { id: true, active: true },
      });
      if (!category || !category.active) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'Pick an active category.',
        });
      }
    }

    const data: Prisma.BusinessUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.logoKey !== undefined) data.logoKey = dto.logoKey;
    if (dto.coverPhotoKey !== undefined) data.coverPhotoKey = dto.coverPhotoKey;
    if (dto.shortDescription !== undefined) {
      data.shortDescription = dto.shortDescription || null;
    }
    if (dto.supportEmail !== undefined) {
      data.supportEmail = dto.supportEmail || null;
    }
    if (dto.supportPhone !== undefined) {
      data.supportPhone = dto.supportPhone || null;
    }
    if (Object.keys(data).length === 0) {
      return this.get(businessId);
    }

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data,
      include: { category: true },
    });
    return serializeOwnerBusiness(this.storage, updated);
  }

  async uploadLogo(
    businessId: string,
    file: UploadedBusinessImage | undefined,
  ): Promise<UploadResult> {
    if (!file) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No file provided.',
      });
    }
    const key = await processBusinessLogo(this.storage, businessId, file);
    return { key, url: this.storage.publicUrl(key) };
  }

  async uploadCoverPhoto(
    businessId: string,
    file: UploadedBusinessImage | undefined,
  ): Promise<UploadResult> {
    if (!file) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No file provided.',
      });
    }
    const key = await processBusinessCover(this.storage, businessId, file);
    return { key, url: this.storage.publicUrl(key) };
  }
}
