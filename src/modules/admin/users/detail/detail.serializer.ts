import type { Gender, Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminUserDetail {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  status: User['status'];
  role: User['role'];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  onboardingCompletedAt: string | null;
  suspension: {
    suspendedAt: string;
    suspendedUntil: string | null;
    suspendedReason: string | null;
    suspendedBy: { id: string; email: string } | null;
  } | null;
  profile: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    gender: Gender;
    dateOfBirth: string;
    avatarUrl: string;
    locationLat: number;
    locationLng: number;
    placeName: string;
    activitiesHostedCount: number;
    activitiesJoinedCount: number;
    activitiesCompletedCount: number;
    messagesSentCount: number;
    memoriesPostedCount: number;
    photosSharedCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  counts: {
    activeSessions: number;
    reportsFiled: number;
    reportsAgainst: number;
    blocksMade: number;
    blocksReceived: number;
  };
}

type UserWithRelations = User & {
  profile: Profile | null;
  suspendedBy: Pick<User, 'id' | 'email'> | null;
};

interface Counts {
  activeSessions: number;
  reportsFiled: number;
  reportsAgainst: number;
  blocksMade: number;
  blocksReceived: number;
}

export function serializeAdminUserDetail(
  storage: StorageProvider,
  user: UserWithRelations,
  counts: Counts,
): AdminUserDetail {
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt
      ? user.emailVerifiedAt.toISOString()
      : null,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? user.onboardingCompletedAt.toISOString()
      : null,
    suspension: user.suspendedAt
      ? {
          suspendedAt: user.suspendedAt.toISOString(),
          suspendedUntil: user.suspendedUntil
            ? user.suspendedUntil.toISOString()
            : null,
          suspendedReason: user.suspendedReason,
          suspendedBy: user.suspendedBy,
        }
      : null,
    profile: user.profile
      ? {
          id: user.profile.id,
          username: user.profile.username,
          displayName: user.profile.displayName,
          bio: user.profile.bio,
          gender: user.profile.gender,
          dateOfBirth: user.profile.dateOfBirth.toISOString(),
          avatarUrl: storage.publicUrl(user.profile.avatarKey),
          locationLat: user.profile.locationLat,
          locationLng: user.profile.locationLng,
          placeName: user.profile.placeName,
          activitiesHostedCount: user.profile.activitiesHostedCount,
          activitiesJoinedCount: user.profile.activitiesJoinedCount,
          activitiesCompletedCount: user.profile.activitiesCompletedCount,
          messagesSentCount: user.profile.messagesSentCount,
          memoriesPostedCount: user.profile.memoriesPostedCount,
          photosSharedCount: user.profile.photosSharedCount,
          createdAt: user.profile.createdAt.toISOString(),
          updatedAt: user.profile.updatedAt.toISOString(),
        }
      : null,
    counts,
  };
}
