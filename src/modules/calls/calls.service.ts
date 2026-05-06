import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HmsService } from './hms.service';

export interface CallJoinDto {
  token: string;
  roomId: string;
  username: string;
}

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hms: HmsService,
  ) {}

  async join(userId: string, activityId: string): Promise<CallJoinDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, title: true, hmsRoomId: true, status: true },
    });
    if (!activity) throw new NotFoundException('Activity not found.');

    if (activity.status === 'CANCELLED') {
      throw new ForbiddenException('Activity is cancelled.');
    }

    // Verify the user is a participant.
    const participant = await this.prisma.activityParticipant.findUnique({
      where: { activityId_userId: { activityId, userId } },
      select: { userId: true },
    });
    if (!participant) throw new ForbiddenException('Not a participant.');

    const roomId = activity.hmsRoomId!;

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { username: true },
    });

    const token = await this.hms.roomToken(
      roomId,
      userId,
      profile?.username ?? userId,
    );

    return { token, roomId, username: profile?.username ?? 'User' };
  }
}
