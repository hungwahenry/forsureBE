import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';

@Injectable()
export class ExportBuilder {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async build(userId: string): Promise<Buffer> {
    const [user, profile, participations, messages, posts, prefs, blocks, inbox] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            email: true,
            createdAt: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
          },
        }),
        this.prisma.profile.findUnique({
          where: { userId },
          select: {
            username: true,
            displayName: true,
            bio: true,
            dateOfBirth: true,
            gender: true,
            avatarKey: true,
            placeName: true,
            locationLat: true,
            locationLng: true,
            createdAt: true,
          },
        }),
        this.prisma.activityParticipant.findMany({
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
            activity: {
              select: {
                id: true,
                emoji: true,
                title: true,
                startsAt: true,
                placeName: true,
                placeLat: true,
                placeLng: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        }),
        this.prisma.chatMessage.findMany({
          where: { senderUserId: userId },
          select: {
            id: true,
            activityId: true,
            kind: true,
            body: true,
            imageKey: true,
            parentMessageId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.activityPost.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            activityId: true,
            caption: true,
            visibility: true,
            createdAt: true,
            updatedAt: true,
            photos: {
              select: { id: true, imageKey: true, sortOrder: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.notificationPreference.findMany({
          where: { userId },
          select: { eventCode: true, channel: true, enabled: true },
        }),
        this.prisma.userBlock.findMany({
          where: { blockerId: userId },
          select: { blockedId: true, createdAt: true },
        }),
        this.prisma.notification.findMany({
          where: { userId },
          select: {
            id: true,
            eventCode: true,
            title: true,
            body: true,
            data: true,
            readAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const json = {
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      profile: profile
        ? {
            username: profile.username,
            displayName: profile.displayName,
            bio: profile.bio,
            dateOfBirth: profile.dateOfBirth.toISOString(),
            gender: profile.gender,
            avatarUrl: this.storage.publicUrl(profile.avatarKey),
            placeName: profile.placeName,
            lat: profile.locationLat,
            lng: profile.locationLng,
            createdAt: profile.createdAt.toISOString(),
          }
        : null,
      activities: participations.map((p) => ({
        id: p.activity.id,
        role: p.role,
        joinedAt: p.joinedAt.toISOString(),
        emoji: p.activity.emoji,
        title: p.activity.title,
        startsAt: p.activity.startsAt.toISOString(),
        placeName: p.activity.placeName,
        lat: p.activity.placeLat,
        lng: p.activity.placeLng,
        status: p.activity.status,
        createdAt: p.activity.createdAt.toISOString(),
      })),
      messages: messages.map((m) => ({
        id: m.id,
        activityId: m.activityId,
        kind: m.kind,
        body: m.body,
        imageUrl: m.imageKey ? this.storage.publicUrl(m.imageKey) : null,
        parentMessageId: m.parentMessageId,
        createdAt: m.createdAt.toISOString(),
      })),
      memories: posts.map((p) => ({
        id: p.id,
        activityId: p.activityId,
        caption: p.caption,
        visibility: p.visibility,
        photos: p.photos.map((ph) => ({
          id: ph.id,
          url: this.storage.publicUrl(ph.imageKey),
          sortOrder: ph.sortOrder,
        })),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      notificationPreferences: prefs.map((p) => ({
        eventCode: p.eventCode,
        channel: p.channel,
        enabled: p.enabled,
      })),
      blockedUsers: blocks.map((b) => ({
        userId: b.blockedId,
        blockedAt: b.createdAt.toISOString(),
      })),
      inbox: inbox.map((n) => ({
        id: n.id,
        eventCode: n.eventCode,
        title: n.title,
        body: n.body,
        data: n.data,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    };

    return Buffer.from(JSON.stringify(json, null, 2), 'utf8');
  }
}
