import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import {
  processVenuePhoto,
  type UploadedBusinessImage,
} from '../../../common/utils/business-images';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import type { CreateVenueDto } from './dto/create-venue.dto';
import type { UpdateVenueDto } from './dto/update-venue.dto';
import {
  serializeBusinessVenue,
  serializeBusinessVenuePhoto,
  type BusinessVenueDto,
  type BusinessVenuePhotoDto,
} from './venues.serializer';

const VENUE_PHOTO_MAX = 10;

@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(businessId: string): Promise<BusinessVenueDto[]> {
    const rows = await this.prisma.businessVenue.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      include: { photos: true },
    });
    return rows.map((row) => serializeBusinessVenue(this.storage, row));
  }

  async get(businessId: string, venueId: string): Promise<BusinessVenueDto> {
    const row = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      include: { photos: true },
    });
    if (!row || row.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    return serializeBusinessVenue(this.storage, row);
  }

  async create(
    businessId: string,
    dto: CreateVenueDto,
  ): Promise<BusinessVenueDto> {
    const maxRadiusM = dto.maxRadiusM ?? 5000;
    try {
      const row = await this.prisma.businessVenue.create({
        data: {
          id: createId('bvn'),
          businessId,
          placeName: dto.placeName,
          placeLat: dto.placeLat,
          placeLng: dto.placeLng,
          googlePlaceId: dto.googlePlaceId,
          matchingKeywords: dto.matchingKeywords,
          maxRadiusM,
          dailyBudgetCents: dto.dailyBudgetCents,
          dailyBudgetRemaining: dto.dailyBudgetCents,
        },
        include: { photos: true },
      });
      return serializeBusinessVenue(this.storage, row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This venue is already registered.',
        });
      }
      throw err;
    }
  }

  async update(
    businessId: string,
    venueId: string,
    dto: UpdateVenueDto,
  ): Promise<BusinessVenueDto> {
    const existing = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      include: { photos: true },
    });
    if (!existing || existing.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }

    const data: Record<string, unknown> = {};
    if (dto.placeName !== undefined) data.placeName = dto.placeName;
    if (dto.matchingKeywords !== undefined) {
      data.matchingKeywords = dto.matchingKeywords;
    }
    if (dto.maxRadiusM !== undefined) data.maxRadiusM = dto.maxRadiusM;
    if (dto.isPaused !== undefined) data.isPaused = dto.isPaused;
    if (dto.phoneNumber !== undefined) {
      data.phoneNumber = dto.phoneNumber || null;
    }
    if (dto.websiteUrl !== undefined) {
      data.websiteUrl = dto.websiteUrl || null;
    }
    if (
      dto.dailyBudgetCents !== undefined &&
      dto.dailyBudgetCents !== existing.dailyBudgetCents
    ) {
      data.dailyBudgetCents = dto.dailyBudgetCents;
      data.dailyBudgetRemaining = Math.min(
        existing.dailyBudgetRemaining,
        dto.dailyBudgetCents,
      );
    }

    if (Object.keys(data).length === 0) {
      return serializeBusinessVenue(this.storage, existing);
    }

    const row = await this.prisma.businessVenue.update({
      where: { id: venueId },
      data,
      include: { photos: true },
    });
    return serializeBusinessVenue(this.storage, row);
  }

  async remove(businessId: string, venueId: string): Promise<void> {
    const existing = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      select: { id: true, businessId: true },
    });
    if (!existing || existing.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    await this.prisma.businessVenue.delete({ where: { id: venueId } });
  }

  async addPhoto(
    businessId: string,
    venueId: string,
    file: UploadedBusinessImage | undefined,
  ): Promise<BusinessVenuePhotoDto> {
    if (!file) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No file provided.',
      });
    }
    const venue = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      select: { businessId: true, _count: { select: { photos: true } } },
    });
    if (!venue || venue.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    if (venue._count.photos >= VENUE_PHOTO_MAX) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Each venue can have at most ${VENUE_PHOTO_MAX} photos. Delete one to add another.`,
      });
    }

    const key = await processVenuePhoto(this.storage, venueId, file);
    const row = await this.prisma.businessVenuePhoto.create({
      data: {
        id: createId('bvp'),
        venueId,
        imageKey: key,
        sortOrder: venue._count.photos,
      },
    });
    return serializeBusinessVenuePhoto(this.storage, row);
  }

  async removePhoto(
    businessId: string,
    venueId: string,
    photoId: string,
  ): Promise<void> {
    const photo = await this.prisma.businessVenuePhoto.findUnique({
      where: { id: photoId },
      include: { venue: { select: { businessId: true } } },
    });
    if (
      !photo ||
      photo.venueId !== venueId ||
      photo.venue.businessId !== businessId
    ) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Photo not found.',
      });
    }
    await this.prisma.businessVenuePhoto.delete({ where: { id: photoId } });
  }

  async reorderPhotos(
    businessId: string,
    venueId: string,
    photoIds: string[],
  ): Promise<BusinessVenuePhotoDto[]> {
    const photos = await this.prisma.businessVenuePhoto.findMany({
      where: { venueId },
      include: { venue: { select: { businessId: true } } },
    });
    if (
      photos.length === 0 ||
      photos[0].venue.businessId !== businessId
    ) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    const existingIds = new Set(photos.map((p) => p.id));
    if (
      photoIds.length !== photos.length ||
      !photoIds.every((id) => existingIds.has(id))
    ) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message:
          'Photo ids must cover exactly the current photos for this venue.',
      });
    }

    await this.prisma.$transaction(
      photoIds.map((id, idx) =>
        this.prisma.businessVenuePhoto.update({
          where: { id },
          data: { sortOrder: idx },
        }),
      ),
    );
    const refreshed = await this.prisma.businessVenuePhoto.findMany({
      where: { venueId },
      orderBy: { sortOrder: 'asc' },
    });
    return refreshed.map((p) => serializeBusinessVenuePhoto(this.storage, p));
  }
}
