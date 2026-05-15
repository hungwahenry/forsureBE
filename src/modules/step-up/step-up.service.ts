import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  isStepUpAction,
  STEP_UP_ACTION_LABEL,
  type StepUpAction,
} from '../../common/constants/step-up-actions';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import {
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MIN,
} from '../../common/utils/otp';
import {
  buildOtpChallenge,
  handleOtpVerification,
} from '../../common/utils/otp-challenge';
import type { Env } from '../../config/env.schema';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { StepUpStartedDto } from './step-up.serializer';

@Injectable()
export class StepUpService {
  private readonly logger = new Logger(StepUpService.name);
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
  ) {
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async start(userId: string, rawAction: string): Promise<StepUpStartedDto> {
    if (!isStepUpAction(rawAction)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Unknown step-up action: ${rawAction}`,
      });
    }
    const action: StepUpAction = rawAction;

    const cutoff = new Date(Date.now() - OTP_RESEND_COOLDOWN_MS);
    const recent = await this.prisma.stepUpChallenge.findFirst({
      where: {
        userId,
        action,
        consumedAt: null,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return { challengeId: recent.id, ttlMinutes: OTP_TTL_MIN };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    const { challenge, code } = await buildOtpChallenge({
      invalidatePrior: () =>
        this.prisma.stepUpChallenge
          .updateMany({
            where: { userId, action, consumedAt: null },
            data: { consumedAt: new Date() },
          })
          .then(() => undefined),
      create: (codeHash, expiresAt) =>
        this.prisma.stepUpChallenge.create({
          data: {
            id: createId('sup'),
            userId,
            action,
            codeHash,
            expiresAt,
          },
        }),
    });

    if (!this.isProd) {
      this.logger.warn(`Step-up OTP for ${user.email} (${action}): ${code}`);
    }

    try {
      await this.email.send({
        to: user.email,
        template: 'step-up',
        data: {
          code,
          ttlMinutes: OTP_TTL_MIN,
          actionLabel: STEP_UP_ACTION_LABEL[action],
        },
      });
    } catch (err: unknown) {
      if (this.isProd) throw err;
      this.logger.error({ err }, 'Step-up email failed (continuing in dev)');
    }

    return { challengeId: challenge.id, ttlMinutes: OTP_TTL_MIN };
  }

  /**
   * Verify a code against the stored challenge and mark it consumed on
   * success. Throws on any mismatch (wrong code, expired, wrong action,
   * wrong user, too many attempts).
   */
  async verifyAndConsume(args: {
    userId: string;
    challengeId: string;
    code: string;
    expectedAction: StepUpAction;
  }): Promise<void> {
    const { userId, challengeId, code, expectedAction } = args;

    const challenge = await this.prisma.stepUpChallenge.findUnique({
      where: { id: challengeId },
    });
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.action !== expectedAction ||
      challenge.consumedAt
    ) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: 'Invalid confirmation code.',
      });
    }

    await handleOtpVerification({
      challenge,
      candidate: code,
      mismatchMessage: 'Invalid confirmation code.',
      incrementAttempts: () =>
        this.prisma.stepUpChallenge
          .update({
            where: { id: challengeId },
            data: { attempts: { increment: 1 } },
          })
          .then(() => undefined),
      markConsumed: () =>
        this.prisma.stepUpChallenge
          .update({
            where: { id: challengeId },
            data: { consumedAt: new Date() },
          })
          .then(() => undefined),
    });

    await this.prisma.stepUpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
  }
}
