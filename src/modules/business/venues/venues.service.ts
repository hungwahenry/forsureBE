import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateVenueDto } from './dto/create-venue.dto';
import type { UpdateVenueDto } from './dto/update-venue.dto';
import {
  serializeBusinessVenue,
  type BusinessVenueDto,
} from './venues.serializer';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string): Promise<BusinessVenueDto[]> {
    const rows = await this.prisma.businessVenue.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(serializeBusinessVenue);
  }

  async get(businessId: string, venueId: string): Promise<BusinessVenueDto> {
    const row = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
    });
    if (!row || row.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    return serializeBusinessVenue(row);
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
      });
      return serializeBusinessVenue(row);
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
      return serializeBusinessVenue(existing);
    }

    const row = await this.prisma.businessVenue.update({
      where: { id: venueId },
      data,
    });
    return serializeBusinessVenue(row);
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
}
