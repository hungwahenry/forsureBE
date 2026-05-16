import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { FeatureFlagService } from '../../common/feature-flags/feature-flag.service';
import { createId } from '../../common/utils/id';
import { AppConfigService } from '../../common/app-config/app-config.service';
import {
  buildOtpChallenge,
  handleOtpVerification,
} from '../../common/utils/otp-challenge';
import type { Env } from '../../config/env.schema';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import { serializeBusinessMembership } from '../business/business.serializer';
import {
  serializeAccessToken,
  serializeAuthMe,
  serializeTokenPair,
  serializeUser,
  type AccessTokenDto,
  type AuthMeDto,
  type PublicUserDto,
  type TokenPairDto,
} from './auth.serializer';
import { generateRefreshToken, sha256 } from '../../common/utils/crypto';
import { parseDurationToMs } from './utils/duration';

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly isProd: boolean;
  private readonly reviewEmail?: string;
  private readonly reviewCode?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly jwt: JwtService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly featureFlags: FeatureFlagService,
    private readonly appConfig: AppConfigService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlMs = parseDurationToMs(
      config.get('JWT_ACCESS_TTL', { infer: true }),
    );
    this.refreshTtlMs = parseDurationToMs(
      config.get('JWT_REFRESH_TTL', { infer: true }),
    );
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
    this.reviewEmail = config
      .get('REVIEW_ACCOUNT_EMAIL', { infer: true })
      ?.toLowerCase();
    this.reviewCode = config.get('REVIEW_ACCOUNT_CODE', { infer: true });
  }

  // App-store reviewers sign in on one designated email with a fixed code.
  private isReviewLogin(email: string): boolean {
    return (
      !!this.reviewEmail && !!this.reviewCode && email === this.reviewEmail
    );
  }

  async requestCode(email: string, ipAddress?: string): Promise<void> {
    if (this.isReviewLogin(email)) {
      this.logger.debug('App review account — skipping OTP send');
      return;
    }

    const [cooldownSeconds, ttlMinutes] = await Promise.all([
      this.appConfig.getInt('auth.otp_resend_cooldown_seconds'),
      this.appConfig.getInt('auth.otp_ttl_minutes'),
    ]);
    const cutoff = new Date(Date.now() - cooldownSeconds * 1000);
    const recent = await this.prisma.emailVerification.findFirst({
      where: { email, consumedAt: null, createdAt: { gte: cutoff } },
    });
    if (recent) {
      this.logger.debug(`OTP cooldown hit for ${email}; suppressing send`);
      return;
    }

    const { code } = await buildOtpChallenge({
      ttlMinutes,
      invalidatePrior: () =>
        this.prisma.emailVerification
          .updateMany({
            where: { email, consumedAt: null },
            data: { consumedAt: new Date() },
          })
          .then(() => undefined),
      create: (codeHash, expiresAt) =>
        this.prisma.emailVerification.create({
          data: {
            id: createId('evf'),
            email,
            codeHash,
            expiresAt,
            ipAddress,
          },
        }),
    });

    if (!this.isProd) {
      this.logger.warn(`OTP for ${email}: ${code}`);
    }

    try {
      await this.email.send({
        to: email,
        template: 'otp',
        data: { code, ttlMinutes },
      });
    } catch (err: unknown) {
      if (this.isProd) throw err;
      this.logger.error({ err }, 'Email send failed (continuing in dev)');
    }
  }

  async verifyCode(
    email: string,
    code: string,
    ctx: ClientContext,
  ): Promise<
    TokenPairDto & { user: PublicUserDto; onboardingRequired: boolean }
  > {
    let verificationId: string | null = null;

    if (this.isReviewLogin(email)) {
      if (code !== this.reviewCode) {
        throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
          message: 'Incorrect code.',
        });
      }
    } else {
      const verification = await this.prisma.emailVerification.findFirst({
        where: { email, consumedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (!verification) {
        throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
          message: 'Code expired or invalid. Request a new one.',
        });
      }

      await handleOtpVerification({
        challenge: verification,
        candidate: code,
        maxAttempts: await this.appConfig.getInt('auth.otp_max_attempts'),
        incrementAttempts: () =>
          this.prisma.emailVerification
            .update({
              where: { id: verification.id },
              data: { attempts: { increment: 1 } },
            })
            .then(() => undefined),
        markConsumed: () =>
          this.prisma.emailVerification
            .update({
              where: { id: verification.id },
              data: { consumedAt: new Date() },
            })
            .then(() => undefined),
      });
      verificationId = verification.id;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!existing) {
      const signupEnabled = await this.featureFlags.isEnabled(
        'signup_enabled',
        true,
      );
      if (!signupEnabled) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'New sign-ups are temporarily disabled.',
        });
      }
    }

    const now = new Date();
    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      if (verificationId) {
        await tx.emailVerification.update({
          where: { id: verificationId },
          data: { consumedAt: now },
        });
      }
      const user = await tx.user.upsert({
        where: { email },
        update: { lastLoginAt: now, emailVerifiedAt: now },
        create: {
          id: createId('usr'),
          email,
          emailVerifiedAt: now,
          lastLoginAt: now,
        },
        include: { profile: { select: { avatarKey: true } } },
      });
      const tokens = await this.issueTokenPair(
        user.id,
        { onboarded: !!user.onboardingCompletedAt },
        ctx,
        undefined,
        tx,
      );
      return { user, tokens };
    });

    return {
      user: serializeUser(this.storage, user),
      onboardingRequired: !user.onboardingCompletedAt,
      ...tokens,
    };
  }

  async refresh(
    refreshToken: string,
    ctx: ClientContext,
  ): Promise<TokenPairDto> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });

    return this.issueTokenPair(
      stored.user.id,
      { onboarded: !!stored.user.onboardingCompletedAt },
      ctx,
      stored.familyId,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<AuthMeDto> {
    const [user, memberships] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: { select: { avatarKey: true } } },
      }),
      this.prisma.businessMember.findMany({
        where: { userId },
        include: { business: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return serializeAuthMe(
      this.storage,
      user,
      memberships.map((row) => serializeBusinessMembership(this.storage, row)),
    );
  }

  async issueAccessToken(
    userId: string,
    claims: { onboarded: boolean },
  ): Promise<AccessTokenDto> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, onboarded: claims.onboarded },
      { expiresIn: Math.floor(this.accessTtlMs / 1000) },
    );
    return serializeAccessToken(
      accessToken,
      new Date(Date.now() + this.accessTtlMs),
    );
  }

  private async issueTokenPair(
    userId: string,
    claims: { onboarded: boolean },
    ctx: ClientContext,
    familyId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TokenPairDto> {
    const client = tx ?? this.prisma;
    const access = await this.issueAccessToken(userId, claims);

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const id = createId('rt');
    await client.refreshToken.create({
      data: {
        id,
        userId,
        tokenHash: sha256(refreshToken),
        familyId: familyId ?? id,
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        lastUsedAt: new Date(),
      },
    });

    return serializeTokenPair(access, refreshToken, expiresAt);
  }
}
