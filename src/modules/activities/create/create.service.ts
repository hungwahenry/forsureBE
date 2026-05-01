import { Injectable } from '@nestjs/common';
import { ActivityRole, type Activity } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { upsertYearStats } from '../../../common/utils/stats';
import { PrismaService } from '../../../prisma/prisma.service';
import { MembershipService } from '../../chats/membership/membership.service';
import { CreateActivityDto } from './dto/create-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000; // 30 minutes

@Injectable()
export class CreateActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async create(
    authorUserId: string,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    if (dto.startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Activities must start at least 30 minutes from now.',
      });
    }

    const activityId = createId('act');
    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          id: activityId,
          emoji: dto.emoji,
          title: dto.title,
          startsAt: dto.startsAt,
          placeName: dto.placeName,
          placeLat: dto.placeLat,
          placeLng: dto.placeLng,
          capacity: dto.capacity,
          genderPreference: dto.genderPreference,
          memoriesShareablePublicly: dto.memoriesShareablePublicly ?? false,
        },
      });
      await tx.activityParticipant.create({
        data: {
          id: createId('ap'),
          activityId,
          userId: authorUserId,
          role: ActivityRole.HOST,
        },
      });
      await tx.profile.update({
        where: { userId: authorUserId },
        data: { activitiesHostedCount: { increment: 1 } },
      });
      await upsertYearStats(tx, authorUserId, { activitiesHostedCount: 1 });
      return created;
    });

    // Add the host's currently-connected sockets to the new chat room.
    await this.membership.addToChat(authorUserId, activityId);
    return activity;
  }
}
