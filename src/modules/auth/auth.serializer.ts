import type { User, UserRole, UserStatus } from '@prisma/client';
import type { StorageProvider } from '../../storage/storage.interface';
import type { BusinessMembershipDto } from '../business/business.serializer';

export interface AccessTokenDto {
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface TokenPairDto extends AccessTokenDto {
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** Clean public shape of a User row — drops moderation internals. */
export interface PublicUserDto {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  status: UserStatus;
  role: UserRole;
  onboardingCompletedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string;
}

export interface AuthMeDto {
  user: PublicUserDto;
  onboardingRequired: boolean;
  businessMemberships: BusinessMembershipDto[];
}

type UserWithAvatar = User & {
  profile: { avatarKey: string } | null;
};

export function serializeUser(
  storage: StorageProvider,
  user: UserWithAvatar,
): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    status: user.status,
    role: user.role,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    avatarUrl: user.profile ? storage.publicUrl(user.profile.avatarKey) : '',
  };
}

export function serializeAccessToken(
  accessToken: string,
  expiresAt: Date,
): AccessTokenDto {
  return {
    accessToken,
    accessTokenExpiresAt: expiresAt.toISOString(),
  };
}

export function serializeTokenPair(
  access: AccessTokenDto,
  refreshToken: string,
  refreshExpiresAt: Date,
): TokenPairDto {
  return {
    ...access,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
  };
}

export function serializeAuthMe(
  storage: StorageProvider,
  user: UserWithAvatar,
  businessMemberships: BusinessMembershipDto[],
): AuthMeDto {
  return {
    user: serializeUser(storage, user),
    onboardingRequired: !user.onboardingCompletedAt,
    businessMemberships,
  };
}
