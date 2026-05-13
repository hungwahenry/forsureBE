import type { User } from '@prisma/client';
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

export interface AuthMeDto {
  user: User & { avatarUrl: string };
  onboardingRequired: boolean;
  businessMemberships: BusinessMembershipDto[];
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

type UserWithAvatar = User & {
  profile: { avatarKey: string } | null;
};

export function serializeAuthMe(
  storage: StorageProvider,
  user: UserWithAvatar,
  businessMemberships: BusinessMembershipDto[],
): AuthMeDto {
  const { profile, ...rest } = user;
  const avatarUrl = profile ? storage.publicUrl(profile.avatarKey) : '';
  return {
    user: { ...rest, avatarUrl },
    onboardingRequired: !user.onboardingCompletedAt,
    businessMemberships,
  };
}
