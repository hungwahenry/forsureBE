import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../common/app-config/app-config.service';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import type { Env } from '../../config/env.schema';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactLeadDto } from './dto/create-contact-lead.dto';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly turnstileSecret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
  ) {
    this.turnstileSecret = config.get('TURNSTILE_SECRET_KEY', { infer: true });
  }

  async submit(dto: CreateContactLeadDto, ctx: ClientContext): Promise<void> {
    // Honeypot tripped — accept silently so bots get no signal, but store nothing.
    if (dto.website) {
      this.logger.debug('Contact form honeypot tripped; dropping submission');
      return;
    }

    await this.verifyTurnstile(dto.turnstileToken, ctx.ipAddress);

    const lead = await this.prisma.contactLead.create({
      data: {
        id: createId('cl'),
        name: dto.name,
        email: dto.email,
        company: dto.company,
        message: dto.message,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    const notifyTo = await this.appConfig.getString('contact.notification_email');
    if (!notifyTo) return;

    try {
      await this.email.send({
        to: notifyTo,
        template: 'contact-lead',
        data: {
          name: lead.name,
          email: lead.email,
          company: lead.company ?? '—',
          message: lead.message,
        },
      });
    } catch (err: unknown) {
      // Lead is already persisted — a failed notification must not fail the request.
      this.logger.error({ err, leadId: lead.id }, 'Contact notification email failed');
    }
  }

  private async verifyTurnstile(
    token: string | undefined,
    ipAddress: string | undefined,
  ): Promise<void> {
    // No secret configured (e.g. local dev) — skip verification entirely.
    if (!this.turnstileSecret) return;

    if (!token) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Captcha verification is required.',
      });
    }

    const params = new URLSearchParams();
    params.set('secret', this.turnstileSecret);
    params.set('response', token);
    if (ipAddress) params.set('remoteip', ipAddress);

    let success = false;
    try {
      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body: params,
      });
      const data = (await res.json()) as { success?: boolean };
      success = data.success === true;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Turnstile verification request failed');
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: "Couldn't verify the captcha. Please try again.",
      });
    }

    if (!success) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Captcha verification failed. Please try again.',
      });
    }
  }
}
