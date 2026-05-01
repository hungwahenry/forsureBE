import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../config/env.schema';
import { TemplateRenderer } from './template.renderer';

export interface SendEmailParams {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly renderer: TemplateRenderer,
  ) {
    this.resend = new Resend(config.get('RESEND_API_KEY', { infer: true }));
    const fromEmail = config.get('RESEND_FROM_EMAIL', { infer: true });
    const fromName = config.get('RESEND_FROM_NAME', { infer: true });
    this.from = `${fromName} <${fromEmail}>`;
  }

  async send({ to, template, data }: SendEmailParams): Promise<void> {
    const rendered = this.renderer.renderEmail(template, data);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: [to],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (error) {
      this.logger.error({ err: error, to, template }, 'Email delivery failed');
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }
}
