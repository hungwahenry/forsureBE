import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks/stripe')
@Public()
@SkipOnboarding()
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('Missing stripe-signature.');
    if (!req.rawBody) throw new BadRequestException('Missing raw request body.');
    await this.service.handle(req.rawBody, signature);
    return { received: true };
  }
}
