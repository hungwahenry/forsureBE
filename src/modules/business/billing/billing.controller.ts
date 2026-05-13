import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BillingService } from './billing.service';

@ApiTags('Business / Billing')
@ApiBearerAuth()
@Controller('business/billing')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('portal-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Mint a Stripe Billing Portal session URL — the customer manages cancellation, invoices, and payment method on Stripe's hosted page.",
  })
  startPortal(@CurrentBusinessMember() member: BusinessMemberContext) {
    return this.service.startPortalSession(member.businessId);
  }
}
