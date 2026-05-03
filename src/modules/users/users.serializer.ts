import type {
  Activity,
  ActivityParticipant,
  ActivityPost,
  ActivityPostPhoto,
  ActivityRole,
  ActivityStatus,
  Gender,
  Profile,
  User,
} from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import type { StorageProvider } from '../../storage/storage.interface';

export interface MyProfileDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  gender: Gender;
  age: number;
  dateOfBirth: string;
  place: { name: string; lat: number; lng: number };
  memberSince: string;
  stats: {
    activitiesHosted: number;
    activitiesJoined: number;
    activitiesCompleted: number;
    memoriesShared: number;
  };
}

export interface PublicProfileDto {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  gender: Gender;
  age: number;
  placeName: string;
  memberSince: string;
  stats: {
    activitiesHosted: number;
    activitiesCompleted: number;
    memoriesShared: number;
  };
}

export interface UserActivityDto {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  placeName: string;
  status: ActivityStatus;
  role: ActivityRole;
  participantCount: number;
}

export type UserActivityRow = ActivityParticipant & {
  activity: Pick<
    Activity,
    | 'id'
    | 'emoji'
    | 'title'
    | 'startsAt'
    | 'placeName'
    | 'status'
    | 'participantCount'
  >;
};

export function serializeUserActivity(p: UserActivityRow): UserActivityDto {
  return {
    id: p.activity.id,
    emoji: p.activity.emoji,
    title: p.activity.title,
    startsAt: p.activity.startsAt.toISOString(),
    placeName: p.activity.placeName,
    status: p.activity.status,
    role: p.role,
    participantCount: p.activity.participantCount,
  };
}

export interface UserPostDto {
  id: string;
  caption: string | null;
  visibility: 'PUBLIC' | 'PARTICIPANTS';
  createdAt: string;
  photos: { id: string; imageUrl: string; sortOrder: number }[];
  activity: {
    id: string;
    emoji: string;
    title: string;
    startsAt: string;
    placeName: string;
    participantCount: number;
  };
}

type UserWithProfile = User & { profile: Profile | null };

function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  const dayDelta = now.getDate() - dob.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) age -= 1;
  return age;
}

function requireProfile(user: UserWithProfile): Profile {
  if (!user.profile) {
    throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
      message: 'Profile not found.',
    });
  }
  return user.profile;
}

export function serializeMyProfile(
  storage: StorageProvider,
  user: UserWithProfile,
): MyProfileDto {
  const profile = requireProfile(user);
  return {
    id: user.id,
    email: user.email,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: storage.publicUrl(profile.avatarKey),
    gender: profile.gender,
    age: ageFromDob(profile.dateOfBirth),
    dateOfBirth: profile.dateOfBirth.toISOString(),
    place: {
      name: profile.placeName,
      lat: profile.locationLat,
      lng: profile.locationLng,
    },
    memberSince: profile.createdAt.toISOString(),
    stats: {
      activitiesHosted: profile.activitiesHostedCount,
      activitiesJoined: profile.activitiesJoinedCount,
      activitiesCompleted: profile.activitiesCompletedCount,
      memoriesShared: profile.memoriesPostedCount,
    },
  };
}

export function serializePublicProfile(
  storage: StorageProvider,
  user: UserWithProfile,
): PublicProfileDto {
  const profile = requireProfile(user);
  return {
    id: user.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: storage.publicUrl(profile.avatarKey),
    gender: profile.gender,
    age: ageFromDob(profile.dateOfBirth),
    placeName: profile.placeName,
    memberSince: profile.createdAt.toISOString(),
    stats: {
      activitiesHosted: profile.activitiesHostedCount,
      activitiesCompleted: profile.activitiesCompletedCount,
      memoriesShared: profile.memoriesPostedCount,
    },
  };
}

export type UserPostRow = ActivityPost & {
  photos: ActivityPostPhoto[];
  activity: {
    id: string;
    emoji: string;
    title: string;
    startsAt: Date;
    placeName: string;
    participantCount: number;
  };
};

export function serializeUserPost(
  storage: StorageProvider,
  p: UserPostRow,
): UserPostDto {
  return {
    id: p.id,
    caption: p.caption,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    photos: [...p.photos]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        id: photo.id,
        imageUrl: storage.publicUrl(photo.imageKey),
        sortOrder: photo.sortOrder,
      })),
    activity: {
      id: p.activity.id,
      emoji: p.activity.emoji,
      title: p.activity.title,
      startsAt: p.activity.startsAt.toISOString(),
      placeName: p.activity.placeName,
      participantCount: p.activity.participantCount,
    },
  };
}
