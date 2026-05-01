import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import type { Env } from '../../config/env.schema';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOtp, generateRefreshToken, sha256 } from './utils/crypto';
import { parseDurationToMs } from './utils/duration';

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlMs = parseDurationToMs(
      config.get('JWT_ACCESS_TTL', { infer: true }),
    );
    this.refreshTtlMs = parseDurationToMs(
      config.get('JWT_REFRESH_TTL', { infer: true }),
    );
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async requestCode(email: string, ipAddress?: string): Promise<void> {
    const cutoff = new Date(Date.now() - OTP_RESEND_COOLDOWN_MS);
    const recent = await this.prisma.emailVerification.findFirst({
      where: { email, consumedAt: null, createdAt: { gte: cutoff } },
    });
    if (recent) {
      this.logger.debug(`OTP cooldown hit for ${email}; suppressing send`);
      return;
    }

    await this.prisma.emailVerification.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateOtp();
    await this.prisma.emailVerification.create({
      data: {
        id: createId('evf'),
        email,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
        ipAddress,
      },
    });

    if (!this.isProd) {
      this.logger.warn(`OTP for ${email}: ${code}`);
    }

    try {
      await this.email.send({
        to: email,
        template: 'otp',
        data: { code, ttlMinutes: OTP_TTL_MIN },
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
  ): Promise<TokenPair & { user: User; onboardingRequired: boolean }> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: 'Code expired or invalid. Request a new one.',
      });
    }

    if (verification.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      });
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: 'Too many attempts. Request a new code.',
      });
    }

    if (sha256(code) !== verification.codeHash) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: 'Incorrect code.',
      });
    }

    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    });

    const now = new Date();
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { lastLoginAt: now, emailVerifiedAt: now },
      create: {
        id: createId('usr'),
        email,
        emailVerifiedAt: now,
        lastLoginAt: now,
      },
    });

    const tokens = await this.issueTokenPair(
      user.id,
      { onboarded: !!user.onboardingCompletedAt },
      ctx,
    );

    return {
      user,
      onboardingRequired: !user.onboardingCompletedAt,
      ...tokens,
    };
  }

  async refresh(refreshToken: string, ctx: ClientContext): Promise<TokenPair> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
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
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(
    userId: string,
  ): Promise<{ user: User; onboardingRequired: boolean }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return { user, onboardingRequired: !user.onboardingCompletedAt };
  }

  async issueAccessToken(
    userId: string,
    claims: { onboarded: boolean },
  ): Promise<{ accessToken: string; accessTokenExpiresAt: string }> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, onboarded: claims.onboarded },
      { expiresIn: Math.floor(this.accessTtlMs / 1000) },
    );
    return {
      accessToken,
      accessTokenExpiresAt: new Date(
        Date.now() + this.accessTtlMs,
      ).toISOString(),
    };
  }

  private async issueTokenPair(
    userId: string,
    claims: { onboarded: boolean },
    ctx: ClientContext,
  ): Promise<TokenPair> {
    const access = await this.issueAccessToken(userId, claims);

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.refreshToken.create({
      data: {
        id: createId('rt'),
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        lastUsedAt: new Date(),
      },
    });

    return {
      ...access,
      refreshToken,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    };
  }
}
