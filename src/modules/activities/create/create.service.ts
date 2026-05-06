import { Injectable, Logger } from '@nestjs/common';
import { ActivityRole, type Activity } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { MembershipService } from '../../chats/membership/membership.service';
import { HmsService } from '../../calls/hms.service';
import { CreateActivityDto } from './dto/create-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000; // 30 minutes

@Injectable()
export class CreateActivityService {
  private readonly log = new Logger(CreateActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly hms: HmsService,
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
          participantCount: 1,
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
        data: {
          activitiesHostedCount: { increment: 1 },
          activitiesJoinedCount: { increment: 1 },
        },
      });
      return created;
    });

    // Add the host's currently-connected sockets to the new chat room.
    await this.membership.addToChat(authorUserId, activityId);

    // Create a 100ms room for video calls (best-effort — do not fail activity creation).
    this.hms
      .createRoom(`act-${activityId}`)
      .then((hmsRoomId) =>
        this.prisma.activity.update({
          where: { id: activityId },
          data: { hmsRoomId },
        }),
      )
      .catch((err: unknown) =>
        this.log.error(
          { err, activityId },
          '100ms room creation failed — activity created without room',
        ),
      );

    return activity;
  }
}
