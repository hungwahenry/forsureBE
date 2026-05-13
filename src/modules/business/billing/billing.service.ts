import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../stripe.service';

export interface PortalSessionResult {
  url: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async startPortalSession(businessId: string): Promise<PortalSessionResult> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { stripeCustomerId: true },
    });
    if (!business?.stripeCustomerId) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message:
          "No Stripe customer linked yet — subscribe first, then manage billing.",
      });
    }
    const { client, returnUrlBase } = this.stripe.requireConfigured();
    const session = await client.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${returnUrlBase}/business/billing`,
    });
    return { url: session.url };
  }
}
