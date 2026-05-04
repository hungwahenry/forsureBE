import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import {
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MIN,
  verifyOtp,
} from '../../../common/utils/otp';
import type { Env } from '../../../config/env.schema';
import { EmailService } from '../../../email/email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateOtp, sha256 } from '../../auth/utils/crypto';
import {
  serializeMyProfile,
  type MyProfileDto,
} from '../../users/users.serializer';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import { Inject } from '@nestjs/common';
import type { EmailChangeStartedDto } from './email.serializer';

@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async start(
    userId: string,
    newEmailRaw: string,
  ): Promise<EmailChangeStartedDto> {
    const newEmail = newEmailRaw.trim().toLowerCase();

    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    if (me.email === newEmail) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'That is already your email.',
      });
    }
    const taken = await this.prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (taken) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'That email is in use by another account.',
      });
    }

    const cutoff = new Date(Date.now() - OTP_RESEND_COOLDOWN_MS);
    const recent = await this.prisma.emailChangeChallenge.findFirst({
      where: {
        userId,
        newEmail,
        consumedAt: null,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return { challengeId: recent.id, ttlMinutes: OTP_TTL_MIN };
    }

    await this.prisma.emailChangeChallenge.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateOtp();
    const challenge = await this.prisma.emailChangeChallenge.create({
      data: {
        id: createId('ech'),
        userId,
        newEmail,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
      },
    });

    if (!this.isProd) {
      this.logger.warn(`Email-change OTP for ${newEmail}: ${code}`);
    }

    try {
      await this.email.send({
        to: newEmail,
        template: 'otp',
        data: { code, ttlMinutes: OTP_TTL_MIN },
      });
    } catch (err) {
      if (this.isProd) throw err;
      this.logger.error(
        { err },
        'Email-change verification email failed (continuing in dev)',
      );
    }

    return { challengeId: challenge.id, ttlMinutes: OTP_TTL_MIN };
  }

  async confirm(
    userId: string,
    challengeId: string,
    code: string,
  ): Promise<MyProfileDto> {
    const challenge = await this.prisma.emailChangeChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge || challenge.userId !== userId || challenge.consumedAt) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: 'Invalid confirmation code.',
      });
    }

    const result = verifyOtp({
      storedHash: challenge.codeHash,
      attempts: challenge.attempts,
      expiresAt: challenge.expiresAt,
      candidate: code,
    });
    if (!result.ok) {
      if (result.reason === 'MISMATCH') {
        await this.prisma.emailChangeChallenge.update({
          where: { id: challengeId },
          data: { attempts: { increment: 1 } },
        });
        throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
          message: 'Invalid confirmation code.',
        });
      }
      await this.prisma.emailChangeChallenge.update({
        where: { id: challengeId },
        data: { consumedAt: new Date() },
      });
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message:
          result.reason === 'EXPIRED'
            ? 'Code expired. Request a new one.'
            : 'Too many attempts. Request a new code.',
      });
    }

    // Re-check the new email isn't taken between start and confirm.
    const taken = await this.prisma.user.findUnique({
      where: { email: challenge.newEmail },
      select: { id: true },
    });
    if (taken && taken.id !== userId) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'That email is in use by another account.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: challenge.newEmail, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailChangeChallenge.update({
        where: { id: challengeId },
        data: { consumedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    return serializeMyProfile(this.storage, user);
  }
}
