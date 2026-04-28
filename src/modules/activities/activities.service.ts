import { Injectable } from '@nestjs/common';
import { Activity } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000; // 30 minutes

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorUserId: string,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    if (dto.startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Activities must start at least 30 minutes from now.',
      });
    }

    return this.prisma.activity.create({
      data: {
        id: createId('act'),
        authorUserId,
        emoji: dto.emoji,
        title: dto.title,
        startsAt: dto.startsAt,
        placeName: dto.placeName,
        placeLat: dto.placeLat,
        placeLng: dto.placeLng,
        capacity: dto.capacity,
        genderPreference: dto.genderPreference,
      },
    });
  }
}
