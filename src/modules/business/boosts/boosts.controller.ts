import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BoostsService } from './boosts.service';
import { PreviewBoostDto } from './dto/preview-boost.dto';
import { StartBoostDto } from './dto/start-boost.dto';

@ApiTags('Business / Boosts')
@ApiBearerAuth()
@Controller('business/boosts')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BoostsController {
  constructor(private readonly service: BoostsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Returns whether boosting this activity would be free (within the cycle's included boosts) or charged as an overage, with the price.",
  })
  preview(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewBoostDto,
  ) {
    return this.service.preview(member.businessId, user.id, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Start a boost on a hosted activity. Free within the cycle cap; otherwise adds the overage charge to the next subscription invoice via a Stripe invoice item.',
  })
  start(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartBoostDto,
  ) {
    return this.service.start(member.businessId, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the caller's business's recent boosts (active + ended).",
  })
  list(@CurrentBusinessMember() member: BusinessMemberContext) {
    return this.service.list(member.businessId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancel an active boost early. No refund — charged overage stays billed.',
  })
  cancel(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
  ) {
    return this.service.cancel(member.businessId, id);
  }
}
